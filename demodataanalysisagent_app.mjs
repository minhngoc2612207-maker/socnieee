import { breakdown, csvOutput, isBlank, maxBytes, parseCSV, prepare, profile, sampleCSV, sheetLink } from "./data.mjs";

import { collectBusinessEvidence, evidenceText, normalize, questionsFrom } from "./business.mjs";
import { priorityNames, reportNarrative, reportTopic, timeSeries } from "./report.mjs";
import { buildExecutiveDashboard, dashboardMetricColumns } from "./dashboard.mjs";
import { proposeScope } from "./discovery.mjs";

const paths = {
  brand: '<path d="M4 4v16h16M8 15l4-5 4 2 4-6"/><path d="M17 6h3v3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01"/>',
  window: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M9 9v10"/>',
  reset: '<path d="M5 10a7 7 0 1 1 1 7M5 5v5h5"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1.5 1.5m.5 5.5a4 4 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1.5-1.5"/>',
  clean: '<path d="m15 4 5 5-7 7-5-5zm-7 7-4 4 5 5 4-4M17 2l1 1m4 4 1 1M4 4v4M2 6h4"/>',
  chart: '<path d="M4 4v16h16M8 15v-3m4 3V7m4 8V9m4 6V5"/>',
  export: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  sheet: '<path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 0v5h4"/><rect x="7" y="10" width="8" height="7" rx=".7"/><path d="M7 13.5h8m-4-3.5v7"/>',
  upload: '<path d="M12 16V4M8 8l4-4 4 4M4 15v5h16v-5"/>',
  sample: '<path d="M9 3h6m-5 0v7l-5.4 7.8A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.6-3.2L14 10V3M8 15h8"/>',
  sparkle: '<path d="M12 2c.6 6.1 3.9 9.4 10 10-6.1.6-9.4 3.9-10 10-.6-6.1-3.9-9.4-10-10 6.1-.6 9.4-3.9 10-10Z"/>',
  loading: '<path d="M21 12a9 9 0 1 1-9-9"/>',
  report: '<path d="M5 2h10l4 4v16H5zM14 2v5h5M8 11h8m-8 4h8m-8 4h5"/>',
};

const steps = [
  { title: "Kết nối", detail: "Chọn nguồn dữ liệu", icon: "link" },
  { title: "Làm sạch", detail: "Kiểm tra và chuẩn hóa", icon: "clean" },
  { title: "Phân tích", detail: "Khám phá số liệu", icon: "chart" },
  { title: "Báo cáo", detail: "Xem kết quả và xuất tệp", icon: "report" },
];
const defaultConfig = { headers: true, trim: true, empty: true, duplicates: true, incomplete: false };
const defaultAnalysis = { group: 0, metric: -1, mode: "count", locale: "vi" };
const defaultReport = { title: "Báo cáo kinh doanh", summary: "" };
const emptyReview = () => ({ draft: "", request: "", message: "", error: "", blocked: false, applied: false });
const emptyBusiness = () => ({ industry: "", background: "", questions: "" });
const maxSources = 8;
const sampleMarketing = `Ngày,Chiến dịch,Chi phí,Lượt nhấp,Số chuyển đổi
2026-01-01,Tìm kiếm,2480000,530,24
2026-01-01,Mạng xã hội,1940000,620,18
2026-02-01,Tìm kiếm,2790000,610,35
2026-02-01,Mạng xã hội,2290000,780,27
2026-03-01,Tìm kiếm,2810000,680,39
2026-03-01,Giới thiệu,1480000,290,19`;
const modeNames = { sum: "Tổng", mean: "Trung bình", count: "Số dòng" };
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumSignificantDigits: 10 });
const percentFormat = new Intl.NumberFormat("vi-VN", { style: "percent", maximumSignificantDigits: 8 });
const nf = (value, percent = false) => value == null ? "—" : (percent ? percentFormat : numberFormat).format(value);

const workspace = document.querySelector("#workspace");
const navigation = document.querySelector("#navigation");
const sourceStatus = document.querySelector("#source-status");
const dialog = document.querySelector("#dialog");
const dialogContent = document.querySelector("#dialog-content");
const state = {
  step: 0, approved: 0, sources: [], active: 0,
  business: emptyBusiness(), businessOutput: null, businessCall: null, evidence: null, intent: "",
  scope: null, dashboardSource: 0, dashboardPeriods: {},
  report: { ...defaultReport }, reportReview: emptyReview(),
  link: "", busy: false, error: "", request: null,
  get source() { return this.sources[this.active]; },
  get raw() { return this.source?.raw; },
  get config() { return this.source.config; },
  get dataset() { return this.source.dataset; },
  get columns() { return this.source.columns; },
  set columns(columns) { this.source.columns = columns; },
  get analysis() { return this.source.analysis; },
  set analysis(analysis) { this.source.analysis = analysis; },
  get analysisNote() { return this.source.analysisNote; },
  set analysisNote(note) { this.source.analysisNote = note; },
};

function currentReview(step = state.step) {
  return step === 3 ? state.reportReview : state.source.reviews[step];
}

function clearCurrentReview(step = state.step) {
  if (step === 3) state.reportReview = emptyReview();
  else state.source.reviews[step] = emptyReview();
}

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const icon = (key, className = "") => `<span data-icon="${key}" class="${className}" aria-hidden="true"></span>`;
function hydrate(root = document) {
  for (const node of root.querySelectorAll("[data-icon]")) {
    node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[node.dataset.icon] ?? ""}</svg>`;
  }
}

function navigationView() {
  navigation.innerHTML = steps.map((step, i) => `
    <button class="nav-step ${i === state.step ? "current" : i < state.approved ? "done" : ""}"
      data-step="${i}" ${i > state.approved || state.busy ? "disabled" : ""} ${i === state.step ? 'aria-current="step"' : ""}>
      ${icon(step.icon, "nav-icon")}
      <span><strong>${step.title}</strong><small>${step.detail}</small></span>
      ${icon(i < state.approved ? "check" : i === state.step ? "chevron" : "lock", "nav-state")}
    </button>`).join("");
  sourceStatus.innerHTML = `
    ${icon(state.source ? state.source.icon : "database", "source-icon")}
    <span class="source-text">
      <strong title="${escape(state.source?.name)}">${escape(state.source?.name ?? "Chưa có dữ liệu")}</strong>
      <small>${state.source ? `${nf(state.sources.length)} bộ dữ liệu` : "Chờ kết nối nguồn"}</small>
    </span>
    <span class="status-dot ${state.source ? "connected" : ""}" aria-hidden="true"></span>`;
  hydrate(navigation);
  hydrate(sourceStatus);
}

const tag = () => `<span class="step-tag">${icon(steps[state.step].icon)} BƯỚC ${state.step + 1} / 4</span>`;
const header = (title, intro) => `<header class="detail-header">
  ${tag()}<h1 id="view-title">${title}</h1><p class="view-intro">${intro}</p>
</header>`;

const approvalLabels = [
  "Xác nhận nguồn và tiếp tục", "Xác nhận làm sạch và tiếp tục",
  "Xác nhận và tạo báo cáo", "Xác nhận báo cáo",
];
function approvalLabel(step) {
  return step === 0 && (!state.scope || state.scope.stale) ? "Trao đổi yêu cầu" : approvalLabels[step];
}

const feedbackExamples = [
  "Ví dụ: Bỏ mã dòng DS-001.",
  "Ví dụ: Giữ các dòng trùng để đối soát, hoặc bỏ mã dòng DS-001.",
  "Ví dụ: Tính doanh thu trung bình theo kênh.",
  "Ví dụ: Viết tóm tắt ngắn cho quản lý bán hàng.",
];

function canApprove() {
  const { step, sources, business } = state;
  if (state.busy || step > state.approved || !sources.length) return false;
  const reviews = step === 3 ? [state.reportReview] : sources.map(source => source.reviews[step]);
  if (reviews.some(review => review.draft.trim() || review.blocked)) return false;
  const questions = questionsFrom(business.questions);
  if (step === 0) return Boolean(business.industry.trim()) && questions.length > 0 && questions.length <= 8;
  return step !== 1 || sources.every(source => source.dataset.rows.length);
}

function reviewPanel(backButton = "") {
  const { step, busy } = state;
  const review = currentReview(step);
  const approved = state.approved > step;
  const done = step === 3 && approved;
  return `<section class="card section-card review-card" aria-label="Duyệt bước hiện tại">
    <div class="review-heading">
      ${icon(approved ? "check" : "sparkle", "alt-icon")}
      <div><h2>${done ? "Đã xác nhận báo cáo" : "Duyệt bước này"}</h2>
        <p>${done ? "Bạn có thể tải báo cáo hoặc yêu cầu chỉnh sửa." : step === 3 ? "Xác nhận để mở tải xuống." : step === 2 ? "Kiểm tra kết quả phân tích trước khi tạo báo cáo." : "Xem lại các bộ dữ liệu trước khi xác nhận."}</p></div>
    </div>
    <form id="feedback-form">
      <label class="field-label" for="feedback">Yêu cầu sửa</label>
      <textarea id="feedback" name="feedback" maxlength="1000" rows="2" placeholder="${feedbackExamples[step]}"
        aria-describedby="feedback-sharing" ${busy ? "disabled" : ""}>${escape(review.draft)}</textarea>
      <div class="feedback-actions">
        <p id="feedback-sharing">${step === 3 ? "Kiểm tra lại bản xem trước sau khi áp dụng yêu cầu sửa." : "Yêu cầu chỉnh sửa áp dụng cho bộ dữ liệu đang chọn."}</p>
        <button class="${review.draft.trim() ? "primary" : "secondary"}" type="submit" id="send-feedback" ${busy ? "disabled" : ""}>
          ${icon(busy ? "loading" : "sparkle", busy ? "spin" : "")}
          <span>${busy ? "Đang xử lý" : review.draft.trim() ? "Áp dụng yêu cầu sửa" : "Đề xuất chỉnh sửa"}</span>
        </button>
      </div>
    </form>
    <div aria-live="polite">
      ${review.message ? `<div id="revision-result" tabindex="-1" class="agent-message ${review.blocked ? "waiting" : ""}">
        <strong>${review.blocked ? "Chưa áp dụng" : review.applied ? "Đã cập nhật bản xem trước" : "Đề xuất chỉnh sửa"}</strong><p>${escape(review.message)}</p></div>` : ""}
      ${review.error ? `<p class="error agent-error" role="alert">${escape(review.error)}</p>` : ""}
    </div>
    <div class="review-footer">
      ${backButton}
      <div class="approval-actions">
        <button class="text-button" id="discard-feedback" data-action="discard-feedback"
          ${review.blocked || review.draft.trim() || review.error ? "" : "hidden"} ${busy ? "disabled" : ""}>Bỏ yêu cầu sửa</button>
        <button class="primary" type="button" data-action="approve" ${canApprove() && !done ? "" : "disabled"}>
          ${done ? `${icon("check")} Đã xác nhận` : `${approvalLabel(step)} ${icon(step === 3 ? "check" : "arrow")}`}
        </button>
      </div>
    </div>
  </section>`;
}

function contextForm() {
  const { industry, background, questions } = state.business;
  return `<section class="card section-card context-card" aria-labelledby="context-title">
    <div class="review-heading">
      ${icon("report", "alt-icon")}
      <div><h2 id="context-title">Bối cảnh doanh nghiệp</h2><p>Câu hỏi của bạn định hướng việc chọn chỉ số và đọc kết quả.</p></div>
    </div>
    <label class="field-label" for="industry">Loại hình doanh nghiệp <span aria-hidden="true">*</span></label>
    <input id="industry" data-context="industry" required maxlength="120" value="${escape(industry)}"
      placeholder="Ví dụ: Bán lẻ thời trang, SaaS B2B, dịch vụ logistics">
    <label class="field-label" for="background">Thông tin bổ sung <small>· không bắt buộc</small></label>
    <textarea id="background" data-context="background" rows="2" maxlength="900"
      placeholder="Ví dụ: Hai chi nhánh, đang đánh giá hiệu quả quý I">${escape(background)}</textarea>
    <label class="field-label" for="questions">Vấn đề cần phân tích <span aria-hidden="true">*</span></label>
    <textarea id="questions" data-context="questions" rows="3" required maxlength="1200" aria-describedby="questions-hint"
      placeholder="Doanh thu theo kênh nào cao nhất?&#10;Chi phí theo chiến dịch nào cao nhất?">${escape(questions)}</textarea>
    <p id="questions-hint" class="fine-print">Nhập tối đa 8 câu hỏi, mỗi câu một dòng.</p>
  </section>`;
}

function discoveryPanel() {
  const running = state.intent === "discovery";
  const scope = state.scope;
  const questionCount = questionsFrom(state.business.questions).length;
  const ready = Boolean(state.business.industry.trim()) && questionCount > 0 && questionCount <= 8;
  return `<section class="card section-card discovery-card" aria-labelledby="discovery-title">
    <div class="discovery-head">
      <div><h2 id="discovery-title" tabindex="-1">Trao đổi yêu cầu với AI</h2>
        <p>Xem cách AI hiểu yêu cầu và bổ sung thông tin trước khi phân tích.</p></div>
      <button class="secondary" type="button" data-action="discovery" ${ready && !state.busy ? "" : "disabled"}>
        ${icon(running ? "loading" : "sparkle", running ? "spin" : "")}
        <span>${running ? "Đang chuẩn bị…" : scope ? "Xem lại phạm vi" : "Trao đổi yêu cầu"}</span>
      </button>
    </div>
    ${running ? '<p class="stage-status" role="status">Đang chuẩn bị phạm vi phân tích.</p>' : ""}
    ${scope ? `<div class="discovery-plan">
      ${scope.stale ? '<p class="stage-warning">Nguồn đã thay đổi. Xem lại phạm vi với các cột mới trước khi tiếp tục.</p>' : ""}
      <h3>Tôi hiểu yêu cầu của bạn</h3><p>${escape(scope.plan.interpretation)}</p>
      <h3>Góc nhìn đề xuất bổ sung</h3>
      <ul class="findings">${scope.plan.suggestions.map(item => `<li>${escape(item)}</li>`).join("")}</ul>
      <h3>Câu hỏi cần làm rõ</h3>
      <div class="discovery-answers">
        ${scope.plan.followups.map((question, index) => `
          <label class="context-card">
            <span class="field-label">${escape(question)}</span>
            <textarea rows="2" maxlength="500" data-scope-answer="${index}" placeholder="Nhập câu trả lời nếu đã xác định">${escape(scope.answers[index] ?? "")}</textarea>
          </label>`).join("")}
      </div>
      <p class="stage-status">Câu trả lời giúp xác định phạm vi phân tích.</p>
    </div>` : ""}
  </section>`;
}

function sourceSelector() {
  return `<section class="card section-card source-picker">
    <label class="field-label" for="active-source">Bộ dữ liệu đang xem</label>
    <div class="source-controls">
      <select id="active-source">${selectOptions(state.sources.map((source, i) => [
        i, `Bộ ${i + 1} — ${source.name} (${nf(source.raw.length)} dòng nguồn)`,
      ]), state.active)}</select>
      ${state.step === 0 ? '<button class="secondary" data-action="remove-source">Bỏ khỏi phiên</button>' : ""}
    </div>
  </section>`;
}

function sourcePreview() {
  const { raw, source, config } = state;
  const preview = prepare(raw, { headers: config.headers }, excludedIndexes(source));
  return `<section class="view">
    ${header("Kiểm tra nguồn dữ liệu", "Kiểm tra bối cảnh, từng bảng và cách đọc tiêu đề trước khi làm sạch.")}
    ${contextForm()}
    ${discoveryPanel()}
    ${sourceSelector()}
    <section class="card section-card">
      <div class="review-heading">
        ${icon(source.icon, "sheet-logo")}
        <div><h2>${escape(source.name)}</h2><p>${nf(raw.length)} dòng nguồn · ${nf(raw[0].length)} cột</p></div>
      </div>
      <label class="option source-option">
        <input type="checkbox" name="source-headers" ${config.headers ? "checked" : ""}>
        <span><strong>Dùng dòng đầu làm tiêu đề</strong><small>Lấy tên cột từ dòng đầu tiên có dữ liệu.</small></span>
      </label>
      ${table(preview.columns, preview.rows.slice(0, 5), "Xem trước nguồn dữ liệu")}
      ${preview.rows.length > 5 ? '<p class="preview-note">Hiển thị 5 dòng đầu tiên.</p>' : ""}
    </section>
    ${exclusionsView()}
    ${state.sources.length < maxSources ? `<details class="card section-card add-sources" ${state.busy || state.error ? "open" : ""}>
      <summary>Thêm bộ dữ liệu</summary>${sourceInputs()}</details>` : `
      <p class="fine-print preview-note">Đã đạt giới hạn ${maxSources} bộ dữ liệu trong một phiên.</p>
      ${state.error ? `<p class="error preview-note" role="alert">${escape(state.error)}</p>` : ""}`}
    ${reviewPanel()}
  </section>`;
}

function sourceView() {
  if (state.raw) return sourcePreview();
  return `<section class="view source-view">
    <div class="hero">
      <div>${tag()}<h1 id="view-title">Kết nối dữ liệu</h1>
        <p class="view-intro">Nhập câu hỏi kinh doanh và thêm các bảng cần phân tích.</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-sheet back"></div>
        <div class="art-sheet front">
          <div class="art-controls"><i></i><i></i><i></i></div>
          <div class="art-grid">${"<i></i>".repeat(16)}</div>
        </div>
        ${icon("link", "art-link")}${icon("sparkle", "art-star")}
      </div>
    </div>

    ${contextForm()}
    ${discoveryPanel()}
    ${sourceInputs()}
  </section>`;
}

function sourceInputs() {
  return `<form class="card import-card" id="import-form" novalidate aria-busy="${state.busy}">
      <div class="import-title">
        ${icon("sheet", "sheet-logo")}
        <div><h2>Google Sheets</h2><p>Nhập dữ liệu từ một tab bằng liên kết chia sẻ.</p></div>
      </div>
      <label class="field-label" for="sheet-link">Liên kết bảng tính</label>
      <div class="import-fields">
        <div class="input-wrap">
          ${icon("link")}
          <input type="url" id="sheet-link" name="link" value="${escape(state.link)}" maxlength="1200" autocomplete="off"
            placeholder="https://docs.google.com/spreadsheets/d/…" aria-describedby="sharing-note import-error" ${state.busy ? "disabled" : ""} required>
        </div>
        <button class="primary" type="submit" ${state.busy ? "disabled" : ""}>
          ${state.busy ? `${icon("loading", "spin")} Đang đọc dữ liệu` : `Kết nối bảng tính ${icon("arrow")}`}
        </button>
      </div>
      <p class="field-note" id="sharing-note">${icon("lock")} Liên kết cần có quyền xem cho bất kỳ ai có đường dẫn.</p>
      <p class="error" id="import-error" role="alert">${escape(state.error)}</p>
    </form>

    <div class="alt-label">Nguồn dữ liệu khác</div>
    <div class="alt-grid">
      <button class="card alt-option" data-action="file" ${state.busy ? "disabled" : ""}>
        ${icon("upload", "alt-icon")}<span><strong>Tải tệp CSV/TSV</strong><small>Chọn một hoặc nhiều tệp</small></span>${icon("chevron")}
      </button>
      ${!state.raw ? `<button class="card alt-option" data-action="sample">
        ${icon("sample", "alt-icon sample")}<span><strong>Thử dữ liệu mẫu</strong><small>Doanh thu và marketing</small></span>${icon("chevron")}
      </button>` : ""}
      <input id="csv-file" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" multiple hidden>
    </div>`;
}

function metric(label, value) {
  return `<div class="card metric"><span>${label}</span><strong>${nf(value)}</strong></div>`;
}
function table(headers, rows, label) {
  if (!rows.length) return '<p class="fine-print">Chưa có dòng dữ liệu để hiển thị.</p>';
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${label}">
    <table><thead><tr>${headers.map(value => `<th scope="col">${escape(value)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(value => {
      const blank = value == null || String(value).trim() === "";
      return blank
        ? '<td class="table-empty" aria-label="Ô trống">—</td>'
        : `<td title="${escape(value)}">${escape(value)}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>
  </div>`;
}

const cleaningOptions = [
  ["trim", "Cắt khoảng trắng thừa", "Xóa khoảng trắng ở đầu và cuối mỗi ô."],
  ["empty", "Xóa dòng trống", "Loại bỏ các dòng có tất cả ô trống."],
  ["duplicates", "Xóa dòng trùng lặp", "Chỉ giữ lần xuất hiện đầu tiên của mỗi dòng."],
  ["incomplete", "Xóa dòng thiếu dữ liệu", "Loại bỏ mọi dòng có ít nhất một ô trống."],
];

function cleaningSummary() {
  const { audit, rows, columns } = state.dataset;
  const removed = audit.original - rows.length;
  return `<div class="metrics">
      ${metric("Dòng sau làm sạch", rows.length)}
      ${metric("Dòng đã loại bỏ", removed)}
      ${metric("Ô trống còn lại", audit.missing)}
    </div>
    <section class="card section-card">
      <h2>Xem trước sau làm sạch</h2>
      <p>${nf(audit.original)} dòng nguồn · ${nf(audit.empty)} dòng trống · ${nf(audit.duplicates)} dòng trùng · ${nf(audit.incomplete)} dòng thiếu bị xóa · ${nf(audit.excluded)} dòng bỏ theo yêu cầu · ${nf(audit.trimmed)} ô đã cắt khoảng trắng</p>
      ${table(columns, rows.slice(0, 8), "Xem trước bảng dữ liệu đã làm sạch")}
      ${rows.length > 8 ? "<p style='margin-top:8px'>Hiển thị 8 dòng đầu tiên.</p>" : ""}
      ${rows.length ? "" : '<p class="error preview-note" role="status">Hãy điều chỉnh tùy chọn để giữ ít nhất một dòng dữ liệu.</p>'}
    </section>`;
}

function cleanView() {
  return `<section class="view">
    ${header("Làm sạch dữ liệu", "Tùy chỉnh quy tắc và kiểm tra kết quả của từng bộ dữ liệu.")}
    ${sourceSelector()}
    <section class="card section-card">
      <h2>Quy tắc làm sạch</h2>
      <div class="options">${cleaningOptions.map(([key, label, detail]) => `
        <label class="option"><input type="checkbox" name="clean" value="${key}" ${state.config[key] ? "checked" : ""}>
          <span><strong>${label}</strong><small>${detail}</small></span></label>`).join("")}
      </div>
    </section>
    <div id="cleaning-summary">${cleaningSummary()}</div>
    ${exclusionsView()}
    ${reviewPanel(`<button class="secondary" data-step="0">${icon("back")} Nguồn dữ liệu</button>`)}
  </section>`;
}

function selectOptions(items, selected) {
  return items.map(([key, label]) => `<option value="${escape(key)}" ${String(key) === String(selected) ? "selected" : ""}>${escape(label)}</option>`).join("");
}

function findings(groups, percent, source = state.source) {
  const { audit, rows, columns } = source.dataset;
  const { group, metric: metricIndex, mode } = source.analysis;
  const leader = groups[0];
  const leastComplete = [...source.columns].sort((a, b) => b.missing - a.missing)[0];
  const numeric = source.columns[metricIndex];
  const metricLabel = mode === "count" ? "số dòng" : `${modeNames[mode].toLowerCase()} của “${columns[metricIndex]}”`;
  return [
    leader ? `“${leader.label}” có ${metricLabel} cao nhất trong ${nf(groups.length)} nhóm của “${columns[group]}” (${nf(leader.value, percent)}).` : "",
    numeric && mode !== "count"
      ? `“${numeric.name}” có giá trị từ ${nf(numeric.min, numeric.percent)} đến ${nf(numeric.max, numeric.percent)}, trung bình ${nf(numeric.mean, numeric.percent)}.` : "",
    audit.missing
      ? `Còn ${nf(audit.missing)} ô trống. “${leastComplete.name}” thiếu nhiều nhất với ${nf(leastComplete.missing)} trên ${nf(rows.length)} dòng.`
      : `Cả ${nf(rows.length)} dòng còn lại đều đầy đủ dữ liệu.`,
  ].filter(Boolean);
}

function chartView(groups, percent, { ordered = false, total = groups.length, label = "Biểu đồ nhóm dữ liệu", sequence = "giá trị giảm dần", unit = "" } = {}) {
  const displayed = groups.slice(0, ordered ? 12 : 8);
  if (!displayed.length) return '<p class="fine-print">Chưa có giá trị để tổng hợp.</p>';
  const max = Math.max(...displayed.map(item => Math.abs(item.value))) || 1;
  return `<div class="chart" role="list" aria-label="${escape(label)}">
    ${displayed.map(item => `<div class="bar-row" role="listitem">
      <span class="bar-label" title="${escape(item.label)}">${escape(item.label)}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill ${item.value < 0 ? "negative" : ""}" style="width:${Math.abs(item.value) / max * 100}%"></span></span>
      <span class="bar-value">${nf(item.value, percent)}${unit ? " " + escape(unit) : ""}</span>
    </div>`).join("")}</div>
    <p>${total > displayed.length ? `Hiển thị ${nf(displayed.length)} trong ${nf(total)} nhóm` : `${nf(total)} nhóm`} theo ${ordered ? sequence : "giá trị giảm dần"}.
    ${displayed.some(item => item.value < 0) ? " Thanh tím biểu thị giá trị âm theo độ lớn tuyệt đối." : ""}</p>`;
}

function businessEvidence() {
  state.evidence ??= collectBusinessEvidence(state.sources, questionsFrom(state.business.questions));
  return state.evidence;
}

function businessView() {
  return `<section class="card section-card business-analysis">
    <div class="review-heading">
      ${icon("sparkle", "alt-icon")}
      <div><h2>Phân tích theo bối cảnh</h2><p>${escape(state.business.industry)} · ${nf(state.sources.length)} bộ dữ liệu</p></div>
    </div>
    ${state.business.background.trim() ? `<p class="business-background">${escape(state.business.background)}</p>` : ""}
    <div class="evidence-list">${businessEvidence().map(({ question, facts, caveats }) => `
      <section class="evidence-card">
        <h3>${escape(question)}</h3>
        ${facts.length ? `<ul class="findings">${facts.map(fact => `<li>${escape(evidenceText(fact))}</li>`).join("")}</ul>` : ""}
        ${caveats.map(caveat => `<p class="preview-note">${escape(caveat)}</p>`).join("")}
      </section>`).join("")}</div>
  </section>`;
}

function reportRunControls() {
  const call = state.businessCall;
  const running = state.intent === "business";
  return `<div class="report-tools">
    <p role="status">${running ? "Đang hoàn thiện báo cáo…" : call?.status === "failed" ? "Báo cáo hiện dựa trên số liệu đã tổng hợp. Bạn có thể thử cập nhật lại." : ""}</p>
    <button class="secondary" type="button" data-action="business-analysis" ${state.busy ? "disabled" : ""}>
      ${icon(running ? "loading" : "reset", running ? "spin" : "")} ${running ? "Đang cập nhật" : "Cập nhật báo cáo"}
    </button>
  </div>`;
}

function scopeAnswers() {
  return state.scope?.plan.followups.flatMap((question, index) => {
    const answer = state.scope.answers[index]?.trim();
    return answer ? [{ question, answer }] : [];
  }) ?? [];
}

async function reviewBusinessScope() {
  const questions = questionsFrom(state.business.questions);
  if (state.step !== 0 || state.busy || !state.business.industry.trim() || !questions.length || questions.length > 8) return;
  const previousAnswers = [...(state.scope?.priorAnswers ?? []), ...scopeAnswers()].slice(-8);
  const request = new AbortController();
  Object.assign(state, { busy: true, request, intent: "discovery" });
  renderAtCurrentScroll();
  let scope;
  try {
    const context = {
      business: { industry: state.business.industry.trim(), background: state.business.background.trim() },
      questions, clarification: previousAnswers,
      sources: state.sources.map(source => ({ name: source.name.slice(0, 100), columns: source.dataset.columns.slice(0, 24).map(name => name.slice(0, 70)) })),
    };
    const response = await fetch("/api/revise", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
      body: JSON.stringify({ stage: 0, intent: "discovery", feedback: "", context }),
    });
    const result = await response.json().catch(() => ({}));
    if (state.request !== request) return;
    if (response.ok && result.status === "ready" && result.changes?.followups?.length) {
      scope = { plan: result.changes };
    } else {
      scope = { plan: proposeScope(state.business, state.sources) };
    }
  } catch {
    if (state.request !== request) return;
    scope = { plan: proposeScope(state.business, state.sources) };
  }
  invalidate(0);
  scope.answers = scope.plan.followups.map(question => previousAnswers.find(item => item.question === question)?.answer ?? "");
  scope.priorAnswers = previousAnswers.filter(item => !scope.plan.followups.includes(item.question));
  Object.assign(state, { scope, busy: false, request: null, intent: "" });
  renderAtCurrentScroll("#discovery-title");
  workspace.querySelector("#discovery-title").scrollIntoView({ block: "start" });
}

function businessAgentContext() {
  return {
    scope: state.scope ? { interpretation: state.scope.plan.interpretation, clarification: [...state.scope.priorAnswers, ...scopeAnswers()].slice(-8) } : null,
    business: { industry: state.business.industry.trim(), background: state.business.background.trim() },
    questions: businessEvidence().map(({ question, facts, caveats }) => ({
      question, caveats,
      evidence: facts.slice(0, 8).map(fact => evidenceText(fact).slice(0, 300)),
      comparisons: facts.filter(fact => fact.groups.length > 1).slice(0, 3).map(fact => ({
        source: fact.source.slice(0, 85), metric: fact.metric.slice(0, 60), group: fact.group.slice(0, 45),
        mode: fact.mode, percent: fact.percent,
        values: fact.groups.slice(0, 4).map(group => ({ label: group.label.slice(0, 45), value: group.value })),
      })),
    })),
    sources: state.sources.map((source, index) => ({
      source: `Bộ ${index + 1} — ${source.name.slice(0, 90)}`, rows: source.dataset.rows.length, quality: source.dataset.audit,
      dashboard: dashboardContext(source),
      columns: source.columns.slice(0, 24).map(column => ({
        name: column.name.slice(0, 70), kind: column.numeric ? "numeric" : "text_or_date",
        missing: column.missing, distinct: column.distinct, mean: column.mean, min: column.min, max: column.max, percent: column.percent,
      })),
    })),
  };
}

async function analyzeBusiness({ enter = false } = {}) {
  if (state.busy || state.step !== 3) return;
  const context = businessAgentContext();
  const request = new AbortController();
  Object.assign(state, { busy: true, request, intent: "business", businessCall: null });
  if (enter) render(true);
  else renderAtCurrentScroll();
  let call;
  try {
    const response = await fetch("/api/revise", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: 2, intent: "business", feedback: "", context }), signal: request.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (state.request !== request) return;
    if (response.ok && result.status === "ready" && result.changes) {
      invalidate(3);
      state.businessOutput = result.changes;
      call = { status: result.partial ? "partial" : "ready" };
    } else {
      call = { status: "failed" };
    }
  } catch {
    if (state.request !== request) return;
    call = { status: "failed" };
  }
  Object.assign(state, { busy: false, request: null, intent: "", businessCall: call });
  renderAtCurrentScroll('[data-action="business-analysis"]');
}

function analysisView() {
  const { dataset, columns, analysis } = state;
  const groups = breakdown(dataset, analysis);
  const percent = analysis.mode !== "count" && columns[analysis.metric]?.percent;
  const stats = columns.map(item => [
    item.name, item.numeric ? "Số" : "Văn bản / khác", nf(item.missing), nf(item.distinct),
    nf(item.mean, item.percent), nf(item.min, item.percent), nf(item.max, item.percent),
  ]);
  const available = columns.filter(item => item.numeric);
  return `<section class="view">
    ${header("Phân tích dữ liệu", "Đọc kết quả theo câu hỏi kinh doanh và kiểm tra số liệu của từng bộ.")}
    ${businessView()}
    ${sourceSelector()}
    <div class="metrics">
      ${metric("Dòng dữ liệu", dataset.rows.length)}
      ${metric("Số cột", dataset.columns.length)}
      ${metric("Cột dạng số", available.length)}
    </div>
    <section class="card section-card">
      <h2>So sánh theo nhóm</h2>
      <div class="chart-controls">
        <label><span class="field-label">Nhóm theo</span><select name="group">${selectOptions(columns.map(item => [item.index, item.name]), analysis.group)}</select></label>
        <label><span class="field-label">Phép tổng hợp</span><select name="mode">${selectOptions(Object.entries(modeNames).filter(([key]) => available.length || key === "count"), analysis.mode)}</select></label>
        <label><span class="field-label">Cột số</span><select name="metric" ${analysis.mode === "count" ? "disabled" : ""}>
          ${selectOptions(available.length ? available.map(item => [item.index, item.name]) : [[-1, "Không có cột số"]], analysis.metric)}</select></label>
      </div>
      ${chartView(groups, percent)}
    </section>
    <section class="card section-card">
      <h2>Nhận xét tự động</h2>
      <ul class="findings">${findings(groups, percent).map(value => `<li>${escape(value)}</li>`).join("")}</ul>
      ${state.analysisNote ? `<div class="agent-message"><strong>Nhận định bổ sung</strong><p>${escape(state.analysisNote)}</p></div>` : ""}
    </section>
    <section class="card section-card">
      <h2>Thống kê theo cột</h2>
      <p>Ứng dụng nhận dạng cột số theo định dạng bạn chọn.</p>
      <label class="field-label" style="margin-top:10px">Định dạng số
        <select name="locale" style="display:block;margin-top:5px;height:35px">
          ${selectOptions([["vi", "Việt Nam · 1.234,56"], ["en", "Quốc tế · 1,234.56"]], analysis.locale)}
        </select>
      </label>
      ${table(["Cột", "Kiểu", "Ô trống", "Giá trị khác nhau", "Trung bình", "Nhỏ nhất", "Lớn nhất"], stats, "Thống kê theo cột")}
    </section>
    ${reviewPanel(`<button class="secondary" data-step="1">${icon("back")} Làm sạch</button>`)}
  </section>`;
}

const dashboardColors = ["#117a78", "#69bd9e", "#accc71", "#527faf", "#b49bcc", "#e2b461"];
const dashboardPercent = new Intl.NumberFormat("vi-VN", { style: "percent", maximumFractionDigits: 1 });
const formatAmount = (value, unit, percent = false) => value == null ? "—" : nf(value, percent) + (unit && !percent ? " " + unit : "");
const formatPeriod = value => value === "all" ? "Toàn bộ dữ liệu" : "Tháng " + value.slice(5) + "/" + value.slice(0, 4);

function dashboardContext(source) {
  const data = buildExecutiveDashboard(source);
  return {
    period: data.period, previousPeriod: data.previousPeriod, rows: data.rows, invalidDates: data.invalidDates,
    kpis: data.kpis, dimension: data.dimension, revenueHistory: data.series,
    salesBreakdown: data.salesGroups.slice(0, 6), costBreakdown: data.costGroups.slice(0, 6),
    revenueDrivers: data.drivers.slice(0, 6), margin: data.margin, orderValue: data.orderValue,
  };
}

function kpiCard(item, data) {
  const trend = item.change != null
    ? `${item.change > 0 ? "+" : ""}${dashboardPercent.format(item.change)}`
    : item.delta != null ? `${item.delta > 0 ? "+" : ""}${formatAmount(item.delta, item.unit)}` : "";
  const compareNote = data.period === "all" ? "Tổng trên toàn bộ dữ liệu"
    : data.previousPeriod ? "Thiếu chỉ số đầy đủ để đối chiếu kỳ trước" : "Thiếu dữ liệu tháng liền trước";
  return `<article class="dashboard-kpi">
    <h3>${item.title}</h3><strong>${formatAmount(item.value, item.unit)}</strong>
    <p>${item.column ? escape(item.column) : item.ambiguous ? "Có nhiều cột phù hợp" : "Chưa có cột phù hợp"}</p>
    ${item.column ? `<p>${trend ? `<b class="${item.delta < 0 ? "delta-negative" : "delta-positive"}">${escape(trend)}</b> so với ${escape(formatPeriod(data.previousPeriod))}` : compareNote}</p>
      ${item.covered < data.rows ? `<p>${nf(item.covered)}/${nf(data.rows)} dòng có số liệu</p>` : ""}` : ""}
  </article>`;
}

function dashboardDonut(groups, title, unit, dimension) {
  const positive = groups.filter(group => group.value > 0);
  if (!positive.length || groups.some(group => group.value < 0)) return "";
  const visible = positive.slice(0, 5);
  const remainder = positive.slice(5).reduce((sum, item) => sum + item.value, 0);
  if (remainder) visible.push({ label: "Nhóm còn lại", value: remainder });
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  let position = 0;
  const segments = visible.map((item, index) => {
    const start = position;
    position += item.value / total * 100;
    return `${dashboardColors[index]} ${start}% ${position}%`;
  });
  return `<figure class="dashboard-panel">
    <figcaption><strong>${title}</strong><span>Theo ${escape(dimension)}</span></figcaption>
    <div class="dashboard-donut-layout">
      <div class="dashboard-donut" aria-hidden="true" style="background:conic-gradient(${segments.join(",")})"></div>
      <ul class="dashboard-legend">${visible.map((item, index) => `
        <li><span class="legend-swatch" style="background:${dashboardColors[index]}"></span>
          <span>${escape(item.label)}</span><strong>${formatAmount(item.value, unit)}</strong><span>${dashboardPercent.format(item.value / total)}</span>
        </li>`).join("")}</ul>
    </div>
  </figure>`;
}

function dashboardTrend(series, revenue) {
  if (series.filter(item => item.value != null).length < 2) return "";
  return `<figure class="dashboard-panel dashboard-trend">
    <figcaption><strong>Doanh thu theo tháng</strong><span>${escape(revenue.column)} · Tối đa 12 tháng có dữ liệu để đối chiếu</span></figcaption>
    <canvas data-dashboard-trend="${escape(JSON.stringify(series))}" aria-hidden="true"></canvas>
    <details class="report-data-table"><summary>Số liệu theo tháng</summary>
      ${table(["Tháng", "Doanh thu", "Dòng có số liệu"],
        series.map(item => [formatPeriod(item.label), formatAmount(item.value, revenue.unit), `${nf(item.covered)}/${nf(item.count)}`]), "Số liệu doanh thu theo tháng")}
    </details>
  </figure>`;
}

function paintDashboardTrend() {
  const canvas = workspace.querySelector("canvas[data-dashboard-trend]");
  if (!canvas || !canvas.clientWidth) return;
  const series = JSON.parse(canvas.dataset.dashboardTrend);
  const width = canvas.clientWidth, height = canvas.clientHeight, dpi = Math.min(devicePixelRatio, 2);
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpi, dpi);
  const left = 57, right = width - 12, top = 10, bottom = height - 28;
  const values = series.filter(item => item.value != null).map(item => item.value);
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const range = max - min || 1;
  const y = value => bottom - (value - min) / range * (bottom - top);
  const x = index => left + index * (right - left) / (series.length - 1);
  const shortNumber = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
  ctx.font = "11px system-ui";
  for (let tick = 0; tick <= 4; tick++) {
    const value = min + tick * range / 4;
    const yy = y(value);
    ctx.strokeStyle = "#dce9e5";
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillStyle = "#4e685f";
    ctx.fillText(shortNumber.format(value), left - 6, yy + 4);
  }
  const points = series.map((item,index) => item.value == null ? null : { x: x(index), y: y(item.value), label: item.label });
  const segments = [];
  let segment = [];
  for (const point of points) {
    const previous = segment.at(-1);
    if (previous) {
      const [year, month] = point?.label.split("-").map(Number) ?? [];
      const [oldYear, oldMonth] = previous.label.split("-").map(Number);
      if (!point || (year * 12 + month) - (oldYear * 12 + oldMonth) !== 1) {
        segments.push(segment);
        segment = [];
      }
    }
    if (point) segment.push(point);
  }
  if (segment.length) segments.push(segment);
  for (const line of segments) {
    if (line.length > 1) {
      ctx.beginPath();
      ctx.moveTo(line[0].x, y(0));
      for (const point of line) ctx.lineTo(point.x, point.y);
      ctx.lineTo(line.at(-1).x, y(0));
      ctx.closePath();
      ctx.fillStyle = "#a8dbcd88";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      for (const point of line.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = "#117a78";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const point of line) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = "#117a78";
      ctx.fill();
    }
  }
  ctx.fillStyle = "#4e685f";
  const labelStep = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor((right - left) / 65))));
  for (let i = 0; i < series.length; i += labelStep) {
    ctx.textAlign = i === 0 ? "left" : i === series.length - 1 ? "right" : "center";
    ctx.fillText(series[i].label, x(i), height - 8);
  }
}

function executiveDashboard() {
  const index = Math.min(state.dashboardSource, state.sources.length - 1);
  const source = state.sources[index];
  const data = buildExecutiveDashboard(source, state.dashboardPeriods[index]);
  const revenue = data.kpis.find(item => item.key === "revenue");
  const cost = data.kpis.find(item => item.key === "cost");
  const costChart = data.costGroups.length > 1 && dashboardDonut(data.costGroups, "Cơ cấu chi phí", cost.unit, data.dimension);
  const comparable = data.drivers.length && data.previousPeriod;
  const measure = value => formatAmount(value, revenue.unit);
  return `<section class="card section-card executive-dashboard" aria-labelledby="dashboard-title">
    <div class="dashboard-heading">
      <div><h2 id="dashboard-title">Dashboard KPI kinh doanh</h2>
        <p>${escape(formatPeriod(data.period))} · ${nf(data.rows)} dòng · ${escape(source.name)}</p></div>
      <div class="dashboard-controls">
        <label><span class="field-label">Bộ dữ liệu</span><select id="dashboard-source">${selectOptions(state.sources.map((item, i) => [i, item.name]), index)}</select></label>
        <label><span class="field-label">Kỳ báo cáo</span><select id="dashboard-period">${selectOptions([["all", "Toàn bộ dữ liệu"], ...data.months.slice().reverse().map(month => [month, formatPeriod(month)])], data.period)}</select></label>
      </div>
    </div>
    <div class="dashboard-kpis">${data.kpis.map(item => kpiCard(item, data)).join("")}</div>
    ${data.period !== "all" ? `<p class="dashboard-note">So sánh dựa trên các dòng có ngày trong mỗi tháng. Hãy kiểm tra độ đầy đủ của tháng gần nhất.
      ${data.invalidDates ? `${nf(data.invalidDates)} dòng không xác định được tháng đã được bỏ qua trong bộ lọc kỳ.` : ""}</p>` : ""}
    <div class="dashboard-grid">
      ${dashboardTrend(data.series, revenue)}
      ${costChart || (data.costGroups.length > 1 ? `<figure class="dashboard-panel">
        <figcaption><strong>Chi phí theo nhóm</strong><span>${escape(data.dimension)}</span></figcaption>
        ${chartView(data.costGroups, false, { label: "Chi phí theo nhóm", unit: cost.unit })}
      </figure>` : "")}
      ${data.salesGroups.length > 1 ? `<figure class="dashboard-panel">
        <figcaption><strong>Đóng góp doanh thu</strong><span>Theo ${escape(data.dimension)}</span></figcaption>
        ${chartView(data.salesGroups, false, { label: "Đóng góp doanh thu", unit: revenue.unit })}
      </figure>` : ""}
      ${comparable ? `<figure class="dashboard-panel">
        <figcaption><strong>Nhóm làm thay đổi doanh thu</strong><span>${escape(formatPeriod(data.previousPeriod))} → ${escape(formatPeriod(data.period))} · ${escape(data.dimension)}</span></figcaption>
        <p>Từ ${measure(revenue.previous)} đến ${measure(revenue.value)} · Thay đổi ${revenue.delta > 0 ? "+" : ""}${measure(revenue.delta)}</p>
        ${chartView(data.drivers, false, { label: "Đóng góp vào thay đổi doanh thu", unit: revenue.unit, ordered: true, sequence: "độ lớn thay đổi" })}
      </figure>` : ""}
    </div>
    <div class="dashboard-ratios">
      ${data.margin != null ? `<div><span>Tỷ lệ lợi nhuận trên doanh thu</span><strong>${dashboardPercent.format(data.margin)}</strong></div>` : ""}
      ${data.orderValue != null ? `<div><span>Doanh thu bình quân mỗi đơn</span><strong>${measure(data.orderValue)}</strong></div>` : ""}
    </div>
    <p class="dashboard-note">Bộ lọc áp dụng cho các chỉ số trên dashboard. Các phần phân tích tiếp theo sử dụng toàn bộ dữ liệu đã làm sạch.</p>
  </section>`;
}

function reportFindings() {
  return reportNarrative(state.business, businessEvidence(), state.sources, state.businessOutput);
}

function amountUnit(label) {
  return /\bVND\b|VNĐ/i.test(label) ? "đ" : "";
}

function reportSourceCard(source, index) {
  const { dataset, columns, analysis } = source;
  const label = `Bộ ${index + 1} — ${source.name}`;
  const measure = analysis.mode === "count" ? "Số dòng" : columns[analysis.metric]?.name;
  const title = analysis.mode === "count" ? measure : `${modeNames[analysis.mode]} · ${measure}`;
  const percent = analysis.mode !== "count" && columns[analysis.metric]?.percent;
  const groups = breakdown(dataset, analysis);
  const chronology = timeSeries(source);
  const removed = dataset.audit.original - dataset.rows.length;
  return `<article class="report-source">
    <h3>${escape(label)}</h3>
    <p>${nf(dataset.rows.length)} dòng · ${nf(dataset.columns.length)} cột · ${nf(removed)} dòng đã loại · ${nf(dataset.audit.missing)} ô còn trống</p>
    <div class="report-evidence">
      <figure class="report-chart">
        <figcaption><strong>${escape(title)}</strong><span>Theo ${escape(dataset.columns[analysis.group])}</span></figcaption>
        ${chartView(groups, percent, { label: label + " · " + title, unit: amountUnit(measure) })}
      </figure>
      <div class="report-reading"><h4>Phân bố và độ phủ</h4>
        <ul class="findings">${findings(groups, percent, source).map(item => `<li>${escape(item)}</li>`).join("")}</ul>
      </div>
    </div>
    ${chronology && dataset.columns[analysis.group] !== chronology.column ? `
      <div class="report-evidence">
        <figure class="report-chart">
          <figcaption><strong>${escape(title)} theo thời gian</strong><span>${escape(chronology.column)}</span></figcaption>
          ${chartView(chronology.groups, percent, { ordered: true, total: chronology.count, sequence: "thứ tự thời gian", label: label + " · Thời gian", unit: amountUnit(measure) })}
        </figure>
        <div class="report-reading"><h4>Diễn biến theo kỳ</h4>
          <p>Kỳ ${escape(chronology.groups[0].label)} ghi nhận ${formatAmount(chronology.groups[0].value, amountUnit(measure), percent)}. Kỳ gần nhất có dữ liệu (${escape(chronology.groups.at(-1).label)}) ghi nhận ${formatAmount(chronology.groups.at(-1).value, amountUnit(measure), percent)}.</p>
          ${chronology.missing ? `<p>${nf(chronology.missing)} dòng thiếu kỳ báo cáo và không được tính trong biểu đồ.</p>` : ""}
        </div>
      </div>` : ""}
    <details class="report-data-table"><summary>Thống kê từng cột</summary>
      ${table(["Cột", "Ô trống", "Giá trị khác nhau", "Trung bình", "Nhỏ nhất", "Lớn nhất"],
        columns.map(item => [item.name, nf(item.missing), nf(item.distinct), nf(item.mean, item.percent), nf(item.min, item.percent), nf(item.max, item.percent)]),
        "Thống kê từng cột")}
    </details>
  </article>`;
}

function reportQuestions() {
  return businessEvidence().map(({ facts, caveats }, index) => `
    <article class="report-question">
      <h3>${escape(reportTopic(facts, index))}</h3>
      ${caveats.map(item => `<p class="preview-note">${escape(item)}</p>`).join("")}
      ${facts.map(fact => `
        <div class="report-evidence">
          ${fact.groups.length > 1 ? `<figure class="report-chart">
            <figcaption><strong>${escape(modeNames[fact.mode] + " · " + fact.metric)}</strong><span>${escape(fact.source + " · " + fact.group)}</span></figcaption>
            ${chartView(fact.groups, fact.percent, { ordered: fact.order === "last", sequence: "giá trị tăng dần", total: fact.groupCount, label: fact.source + " · " + fact.metric, unit: amountUnit(fact.metric) })}
          </figure>` : ""}
          <div class="report-reading"><h4>${fact.groups.length > 1 ? "Nhận định" : escape(fact.metric)}</h4>
            <p>${escape(evidenceText(fact))}</p>
          </div>
        </div>`).join("")}
    </article>`).join("");
}

function exportView() {
  const coverage = state.sources.reduce((total, { dataset }) => ({
    rows: total.rows + dataset.rows.length,
    removed: total.removed + dataset.audit.original - dataset.rows.length,
    missing: total.missing + dataset.audit.missing,
  }), { rows: 0, removed: 0, missing: 0 });
  const approved = state.approved === 4;
  const narrative = reportFindings();
  return `<section class="view report-view">
    <article class="report-document" aria-labelledby="view-title">
    <header class="detail-header report-header">
      <h1 id="view-title">${escape(state.report.title)}</h1>
      <p class="view-intro">${escape(state.business.industry)} · ${nf(state.sources.length)} bộ dữ liệu · ${nf(coverage.rows)} dòng đã phân tích</p>
      <nav class="report-jump" aria-label="Nội dung báo cáo">
        <a href="#report-summary-section">Tóm tắt</a><a href="#dashboard-title">Chỉ số chính</a><a href="#report-questions">Phân tích chuyên đề</a>
        <a href="#report-actions">Kết luận và đề xuất</a><a href="#report-charts">Nguồn và chất lượng dữ liệu</a>
      </nav>
    </header>
    <section id="report-summary-section" class="card section-card report-section report-summary">
      <h2>Tóm tắt điều hành</h2>
      <p id="report-preview-summary" class="report-prose">${escape(state.report.summary || narrative.summary)}</p>
    </section>
    ${executiveDashboard()}
    <section id="report-questions" class="card section-card report-section">
      <h2>Phân tích chuyên đề</h2>
      ${reportQuestions()}
    </section>
    <section id="report-actions" class="card section-card report-section">
      <h2>Kết luận</h2>
      <ul class="findings">${narrative.conclusions.map(item => `<li>${escape(item)}</li>`).join("")}</ul>
      <h2 class="report-subheading">Đề xuất hành động</h2>
      <ol class="report-recommendations">${narrative.recommendations.map(item => `
        <li>
          <div class="report-recommendation-title"><h3>${escape(item.action)}</h3><span>Ưu tiên ${priorityNames[item.priority].toLowerCase()}</span></div>
          <p>${escape(item.reason)}</p><p><strong>Đo lường</strong> · ${escape(item.measure)}</p>
        </li>`).join("")}</ol>
      ${narrative.limitations.length ? `<h2 class="report-subheading">Giới hạn và dữ liệu cần bổ sung</h2>
        <ul class="findings">${narrative.limitations.map(item => `<li>${escape(item)}</li>`).join("")}</ul>` : ""}
    </section>
    <section id="report-charts" class="card section-card report-section">
      <h2>Nguồn và chất lượng dữ liệu</h2>
      <div class="metrics report-metrics">${metric("Bộ dữ liệu", state.sources.length)}${metric("Dòng đã phân tích", coverage.rows)}
        ${metric("Dòng đã loại bỏ", coverage.removed)}${metric("Ô còn trống", coverage.missing)}</div>
      ${state.sources.map(reportSourceCard).join("")}
    </section>
    </article>

    <aside class="report-workflow" aria-label="Chỉnh sửa và xuất báo cáo">
    ${reportRunControls()}
    <details class="report-data-table report-title-edit"><summary>Chỉnh tiêu đề và tóm tắt</summary>
      <div class="context-card report-edit">
        <label class="field-label" for="report-title">Tiêu đề</label>
        <input id="report-title" data-report="title" value="${escape(state.report.title)}" maxlength="100">
        <label class="field-label" for="report-summary">Tóm tắt</label>
        <textarea id="report-summary" data-report="summary" rows="3" maxlength="1200">${escape(state.report.summary)}</textarea>
      </div>
    </details>
    ${reviewPanel(`<button class="secondary" data-step="2">${icon("back")} Phân tích</button>`)}
    <div class="export-grid">
      <section class="card export-item">
        ${icon("sheet", "sheet-logo")}<h3>Bảng dữ liệu đã làm sạch</h3>
        <div class="csv-downloads">${state.sources.map((source, index) => `
          <button class="secondary" data-action="csv" data-source="${index}" ${approved ? "" : "disabled"}>
            ${icon(approved ? "export" : "lock")} <span>CSV · Bộ ${index + 1} · ${escape(source.name)}</span>
          </button>`).join("")}</div>
      </section>
      <section class="card export-item">
        ${icon("report", "sheet-logo")}<h3>Tệp báo cáo</h3>
        <button class="secondary" data-action="report" ${approved ? "" : "disabled"}>${icon(approved ? "export" : "lock")} Tải báo cáo Markdown</button>
      </section>
    </div>
    ${approved ? `<button class="secondary" data-action="reset">${icon("reset")} Tạo phiên mới</button>` : ""}
    </aside>
  </section>`;
}

function render(focusView = false) {
  const previousStep = Number(workspace.dataset.step);
  workspace.innerHTML = [sourceView, cleanView, analysisView, exportView][state.step]();
  workspace.dataset.step = state.step;
  if (focusView && Number.isFinite(previousStep) && previousStep !== state.step) {
    const view = workspace.firstElementChild;
    view.classList.add("step-enter", state.step < previousStep ? "step-backward" : "step-forward");
  }
  navigationView();
  hydrate(workspace);
  if (state.step === 3) requestAnimationFrame(paintDashboardTrend);
  if (state.busy) {
    for (const control of workspace.querySelectorAll("input, select, button, textarea")) control.disabled = true;
  }
  if (focusView) {
    const heading = document.querySelector("#view-title");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function goTo(step) {
  if (state.busy || step < 0 || step > 3 || step > state.approved) return;
  state.step = step;
  render(true);
}

function invalidate(step) {
  state.approved = Math.min(state.approved, step);
  if (step < 3) {
    state.report = { ...defaultReport };
    state.reportReview = emptyReview();
    state.evidence = null;
    state.businessOutput = null;
    state.businessCall = null;
  }
  for (const source of state.sources) {
    for (let next = step + 1; next < 3; next++) source.reviews[next] = emptyReview();
    if (step < 2) source.analysisNote = "";
  }
}

function rebuildData() {
  state.source.dataset = prepare(state.raw, state.config, excludedIndexes(state.source));
  state.columns = null;
}

function setImportError(error, invalid = false) {
  state.error = error;
  document.querySelector("#import-error").textContent = error;
  const input = document.querySelector("#sheet-link");
  input.setAttribute("aria-invalid", String(invalid));
  if (invalid) input.focus();
}

function addSource(raw, metadata) {
  const config = { ...defaultConfig };
  state.sources.push({
    ...metadata, raw, config, dataset: prepare(raw, config), columns: null,
    exclusions: [],
    analysis: { ...defaultAnalysis }, hasAnalyzed: false, analysisNote: "",
    reviews: [emptyReview(), emptyReview(), emptyReview()],
  });
  state.active = state.sources.length - 1;
  if (state.scope) state.scope.stale = true;
  invalidate(0);
}

function demoSales() {
  const [header, ...rows] = parseCSV(sampleCSV, ",");
  const priceColumn = header.indexOf("Doanh thu");
  header[priceColumn] = "Doanh thu (VND)";
  header.push("Chi phí giá vốn (VND)", "Lợi nhuận gộp (VND)");
  return [header, ...rows.map(row => {
    if (isBlank(row[priceColumn])) return [...row, "", ""];
    const revenue = Number(row[priceColumn]);
    const cost = Math.round(revenue * 0.62);
    return [...row, String(cost), String(revenue - cost)];
  })];
}

function finishImport(error = "") {
  Object.assign(state, { busy: false, error, request: null });
  render(true);
}

async function importSheet(event) {
  event.preventDefault();
  if (state.busy || state.sources.length >= maxSources) return;
  state.link = new FormData(event.target).get("link").trim();
  let source;
  try {
    source = sheetLink(state.link);
    if (state.sources.some(item => item.key === source.exportUrl)) throw new Error("Tab này đã có trong phiên.");
  } catch (error) {
    setImportError(error.message, true);
    return;
  }
  const request = new AbortController();
  Object.assign(state, { busy: true, error: "", request });
  render();
  try {
    const response = await fetch("/api/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: state.link }), signal: request.signal,
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error ?? "Chưa thể nhập bảng tính. Hãy thử lại.");
    }
    const csv = await response.text();
    if (state.request !== request) return;
    addSource(parseCSV(csv, ","), { name: source.name, icon: "sheet", key: source.exportUrl });
    state.link = "";
    finishImport();
  } catch (error) {
    if (state.request !== request) return;
    finishImport(error instanceof TypeError ? "Kết nối bị gián đoạn. Hãy thử lại." : error.message);
    document.querySelector("#sheet-link")?.focus();
  }
}

async function importFiles(files) {
  if (!files.length || state.busy) return;
  const request = new AbortController();
  Object.assign(state, { busy: true, error: "", request });
  render();
  const errors = [];
  for (const file of files) {
    if (state.sources.length >= maxSources) {
      errors.push(`Đã đạt giới hạn ${maxSources} bộ dữ liệu. Một số tệp chưa được nhập.`);
      break;
    }
    try {
      if (file.size > maxBytes) throw new Error("Tệp vượt quá 5 MB.");
      const text = await file.text();
      if (state.request !== request) return;
      addSource(parseCSV(text, file.name.toLowerCase().endsWith(".tsv") ? "\t" : undefined), { name: file.name, icon: "sheet" });
    } catch (error) {
      if (state.request !== request) return;
      errors.push(file.name + " — " + error.message);
    }
  }
  finishImport(errors.join(" "));
}

function refreshProfile(source = state.source) {
  const { analysis } = source;
  source.columns = profile(source.dataset, analysis.locale);
  if (!source.hasAnalyzed) {
    const international = profile(source.dataset, "en");
    if (international.filter(column => column.numeric).length > source.columns.filter(column => column.numeric).length) {
      analysis.locale = "en";
      source.columns = international;
    }
  }
  const fallback = source.columns.findLast(item => item.numeric);
  if (!source.columns[analysis.metric]?.numeric) {
    const revenue = dashboardMetricColumns(source.columns).find(item => item.key === "revenue")?.column;
    analysis.metric = revenue?.index ?? fallback?.index ?? -1;
  }
  if (!fallback) analysis.mode = "count";
}

function initializeAnalysis(source) {
  if (source.columns) return;
  refreshProfile(source);
  if (source.hasAnalyzed) return;
  if (source.analysis.metric >= 0) source.analysis.mode = source.columns[source.analysis.metric].percent ? "mean" : "sum";
  const candidate = source.columns
    .filter(item => !item.numeric && item.distinct > 1)
    .sort((a, b) => a.distinct - b.distinct)[0];
  source.analysis.group = candidate?.index ?? 0;
  source.hasAnalyzed = true;
}

function approve() {
  if (!canApprove()) return;
  if (state.step === 0 && (!state.scope || state.scope.stale)) {
    void reviewBusinessScope();
    return;
  }
  if (state.step === 1) state.sources.forEach(initializeAnalysis);
  state.approved = Math.max(state.approved, state.step + 1);
  if (state.step < 3) {
    if (state.step === 2 && !state.businessCall) {
      state.step = 3;
      void analyzeBusiness({ enter: true });
    } else {
      goTo(state.step + 1);
    }
  } else {
    renderAtCurrentScroll('[data-action="csv"]');
  }
}

function renderAtCurrentScroll(selector) {
  const scroll = window.scrollY;
  render();
  if (selector) workspace.querySelector(selector)?.focus({ preventScroll: true });
  window.scrollTo(0, scroll);
}

function agentContext(step) {
  const header = state.raw.find(row => !row.every(isBlank));
  const context = {
    config: state.config,
    rows: state.raw.length,
    columnCount: header.length,
  };
  const prior = currentReview(step);
  if (prior.request) context.previousFeedback = prior.request;
  if (prior.message) context.previousResponse = prior.message;
  if (step === 0) {
    if (state.config.headers) context.columns = header.slice(0, 32).map(name => name.slice(0, 70));
    return context;
  }

  const data = state.dataset;
  context.audit = data.audit;
  context.columns = data.columns.slice(0, 200).map((name, i) => ({ i, name: name.slice(0, 60) }));
  if (step < 2) return context;

  const numeric = state.columns.filter(item => item.numeric);
  context.numeric = numeric.map(item => item.index);
  context.analysis = state.analysis;
  context.note = state.analysisNote;
  const { group, metric, mode } = state.analysis;
  context.currentGroups = breakdown(data, state.analysis).slice(0, 8).map(item => ({
    label: item.label.slice(0, 80), value: item.value, count: item.count,
  }));
  const column = state.columns[metric];
  context.activeColumns = { group: data.columns[group].slice(0, 70), metric: column?.name.slice(0, 70) };
  context.stats = mode !== "count" && column
    ? { mean: column.mean, min: column.min, max: column.max, percent: column.percent }
    : null;
  if (step === 3) {
    context.report = state.report;
    const business = businessAgentContext();
    return { report: state.report, ...business, analysisSummary: state.businessOutput?.note,
      previousFeedback: context.previousFeedback, previousResponse: context.previousResponse };
  }
  return context;
}

function applyRevision(step, changes) {
  if (step < 2) {
    const keys = step === 0 ? ["headers"] : cleaningOptions.map(([key]) => key);
    const changed = keys.filter(key => typeof changes[key] === "boolean" && changes[key] !== state.config[key]);
    for (const key of changed) state.config[key] = changes[key];
    if (changed.length) {
      rebuildData();
      if (step === 0 && state.scope) state.scope.stale = true;
    }
    return changed.length > 0;
  }
  if (step === 3) {
    const title = changes.title?.trim() || state.report.title;
    const summary = changes.summary ?? state.report.summary;
    const changed = title !== state.report.title || summary !== state.report.summary;
    state.report = { title, summary };
    return changed;
  }

  const { group, metric, mode, locale, note } = changes;
  const analysis = state.analysis;
  const next = {
    group: group ?? analysis.group,
    metric: metric ?? analysis.metric,
    mode: mode ?? analysis.mode,
    locale: locale ?? analysis.locale,
  };
  const columns = next.locale === analysis.locale ? state.columns : profile(state.dataset, next.locale);
  if (!columns[next.group] || (metric != null && !columns[metric]?.numeric)) return false;
  if (!columns[next.metric]?.numeric) next.metric = columns.findLast(item => item.numeric)?.index ?? -1;
  if (next.mode !== "count" && next.metric < 0) return false;
  const settingsChanged = Object.keys(next).some(key => next[key] !== analysis[key]);
  const nextNote = settingsChanged ? "" : note ?? state.analysisNote;
  const changed = settingsChanged || nextNote !== state.analysisNote;
  state.analysis = next;
  state.columns = columns;
  state.analysisNote = nextNote;
  return changed;
}

function excludedIndexes(source) {
  return new Set(source.exclusions.flatMap(exclusion => exclusion.indexes));
}

function exclusionsView() {
  const { exclusions } = state.source;
  if (!exclusions.length) return "";
  return `<section class="card section-card" aria-label="Các dòng đã bỏ">
    <h2>Các dòng đã bỏ theo yêu cầu</h2>
    <ul class="excluded-rows">${exclusions.map(({ code, indexes }, index) => `
      <li><span><strong>${escape(code)}</strong> · ${nf(indexes.length)} dòng</span>
        <button type="button" class="secondary" data-action="restore-exclusion" data-exclusion="${index}"
          aria-label="Khôi phục mã ${escape(code)}">Khôi phục</button>
      </li>`).join("")}</ul>
  </section>`;
}

function applyRowRequest(feedback) {
  const command = /^(?:hãy\s+)?(?:bỏ|xóa|xoá|loại(?:\s+bỏ)?)\s+((?:dòng|bản ghi|hàng)(?:\s+(?:dữ liệu\s+)?(?:có\s+)?(?:mã(?:\s+dòng)?|id))?|mã(?:\s+dòng)?|id)\s*[:=]?\s*[“"']?([\p{L}\p{N}][\p{L}\p{N}_.:/-]{0,99}?)[”"']?(?:\s+khỏi\s+(?:bảng|dữ liệu|bộ dữ liệu))?[.!]?$/iu.exec(feedback);
  if (!command) return null;
  const [, target, code] = command;
  if (!/\bid\b|mã/iu.test(target) && (!/\d/.test(code) || /^\d+$/.test(code))) return null;
  if (state.step > 1) return { blocked: true, message: "Mở bước Kết nối hoặc Làm sạch để bỏ dòng theo mã." };

  const { source, raw, config } = state;
  const headerIndex = config.headers ? raw.findIndex(row => !row.every(isBlank)) : -1;
  const identifierColumns = (raw[headerIndex] ?? []).flatMap((label, index) => {
    const name = normalize(label);
    return /^(?:ma(?: |$)|id(?: |$)|row id$|record id$|order id$|sku$)/.test(name) ? [index] : [];
  });
  if (!identifierColumns.length) {
    return { blocked: true, message: "Bộ hiện tại cần cột nhận dạng, chẳng hạn Mã dòng hoặc ID, để tìm đúng dòng." };
  }

  const matches = identifierColumns.map(column => raw.flatMap((row, index) =>
    index !== headerIndex && row[column]?.trim() === code ? [index] : [],
  )).filter(indexes => indexes.length);
  if (matches.length > 1 && matches.some(indexes => indexes.join(",") !== matches[0].join(","))) {
    return { blocked: true, message: `Mã “${code}” khớp các dòng khác nhau ở nhiều cột. Hãy kiểm tra mã nhận dạng trong bảng.` };
  }
  if (!matches.length) {
    return { blocked: true, message: `Không tìm thấy mã “${code}” trong bộ đang chọn. Hãy kiểm tra mã hoặc chọn đúng bộ dữ liệu.` };
  }
  const existing = excludedIndexes(source);
  const indexes = matches[0].filter(index => !existing.has(index));
  if (!indexes.length) return { applied: true, message: `Các dòng có mã “${code}” đã được bỏ trước đó.` };

  source.exclusions.push({ code, indexes });
  rebuildData();
  invalidate(state.step);
  return { applied: true, message: `Đã bỏ ${nf(indexes.length)} dòng có mã “${code}”. Kiểm tra bản xem trước rồi xác nhận bước này.` };
}

async function sendFeedback(event) {
  event.preventDefault();
  if (state.busy || !state.raw) return;
  const step = state.step;
  const review = currentReview(step);
  const feedback = String(new FormData(event.target).get("feedback") ?? "").trim();
  review.draft = feedback;
  const rowResult = applyRowRequest(feedback);
  if (rowResult) {
    Object.assign(review, {
      request: feedback, draft: rowResult.blocked ? feedback : "", error: "",
      blocked: Boolean(rowResult.blocked), applied: Boolean(rowResult.applied), message: rowResult.message,
    });
    renderAtCurrentScroll(rowResult.blocked ? "#feedback" : "#revision-result");
    return;
  }
  const context = agentContext(step);
  const request = new AbortController();
  Object.assign(state, { busy: true, request });
  review.error = "";
  review.message = "";
  review.applied = false;
  renderAtCurrentScroll();

  try {
    const response = await fetch("/api/revise", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: step, feedback, context }), signal: request.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (state.request !== request) return;
    if (!response.ok) throw new Error("Chưa thể tạo bản sửa. Hãy thử lại hoặc chỉnh trực tiếp.");
    const changed = result.status === "ready" && applyRevision(step, result.changes);
    if (changed) invalidate(step);
    review.request = feedback;
    review.blocked = result.status === "needs_input" || (Boolean(feedback) && !changed);
    review.draft = review.blocked ? feedback : "";
    review.applied = changed;
    review.message = review.blocked && result.status === "ready"
      ? "Yêu cầu này chưa tạo được thay đổi ở bước hiện tại. Hãy nêu rõ thao tác và cột hoặc mã dòng cần sửa."
      : result.message;
  } catch (error) {
    if (state.request !== request) return;
    review.error = error instanceof TypeError ? "Kết nối bị gián đoạn. Hãy thử lại." : error.message;
    if (feedback) review.blocked = true;
  }

  Object.assign(state, { busy: false, request: null });
  renderAtCurrentScroll(review.blocked ? "#feedback" : "#revision-result");
}

function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reportText() {
  const md = value => String(value).replace(/\r?\n|\r/g, " ").replace(/[\\|*_[\]<>@`]/g, "\\$&");
  const paragraphs = value => value.split(/\n+/).map(md).join("\n\n");
  const { business, report, sources } = state;
  const narrative = reportFindings();
  const sourceIndex = Math.min(state.dashboardSource, sources.length - 1);
  const dashboard = buildExecutiveDashboard(sources[sourceIndex], state.dashboardPeriods[sourceIndex]);
  const questionSections = businessEvidence().flatMap(({ facts, caveats }, index) => [
    `### ${md(reportTopic(facts, index))}`, "",
    ...facts.map(fact => "- " + md(evidenceText(fact))),
    ...caveats.map(caveat => "- " + md(caveat)), "",
  ]);
  const datasetSections = sources.flatMap((source, index) => {
    const { dataset, columns, analysis } = source;
    const percent = analysis.mode !== "count" && columns[analysis.metric]?.percent;
    const groups = breakdown(dataset, analysis);
    return [
      `## Bộ ${index + 1} — ${md(source.name)}`, "",
      `Dữ liệu sau làm sạch — ${nf(dataset.rows.length)} dòng, ${nf(dataset.columns.length)} cột`,
      `Đã loại bỏ — ${nf(dataset.audit.empty)} dòng trống, ${nf(dataset.audit.duplicates)} dòng trùng và ${nf(dataset.audit.incomplete)} dòng thiếu`,
      ...(dataset.audit.excluded ? [`Đã bỏ theo yêu cầu — ${nf(dataset.audit.excluded)} dòng`] : []),
      `Chuẩn hóa khoảng trắng — ${nf(dataset.audit.trimmed)} ô`, "",
      "### Nhận xét thống kê", "", ...findings(groups, percent, source).map(line => "- " + md(line)), "",
      "### Tổng hợp theo nhóm", "",
      `Nhóm theo “${md(dataset.columns[analysis.group])}” · ${modeNames[analysis.mode]}${analysis.mode === "count" ? "" : ` của “${md(dataset.columns[analysis.metric])}”`}`, "",
      "| Nhóm | Giá trị | Số dòng được tính |", "| --- | ---: | ---: |",
      ...groups.slice(0, 100).map(item => `| ${md(item.label)} | ${nf(item.value, percent)} | ${nf(item.count)} |`),
      ...(groups.length > 100 ? ["", `Hiển thị 100 trong số ${nf(groups.length)} nhóm.`] : []), "",
      "### Thống kê theo cột", "",
      "| Cột | Ô trống | Giá trị khác nhau | Trung bình | Nhỏ nhất | Lớn nhất |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      ...columns.map(item => `| ${md(item.name)} | ${nf(item.missing)} | ${nf(item.distinct)} | ${nf(item.mean, item.percent)} | ${nf(item.min, item.percent)} | ${nf(item.max, item.percent)} |`), "",
    ];
  });
  return [
    `# ${md(report.title)}`, "",
    "## Tóm tắt điều hành", "", paragraphs(report.summary || narrative.summary), "",
    `Loại hình doanh nghiệp — ${md(business.industry)}`, "",
    "## Dashboard KPI", "", `${md(sources[sourceIndex].name)} · ${formatPeriod(dashboard.period)}`, "",
    "| Chỉ số | Giá trị | Kỳ trước | Thay đổi |", "| --- | ---: | ---: | ---: |",
    ...dashboard.kpis.map(item => `| ${item.title} | ${formatAmount(item.value, item.unit)} | ${formatAmount(item.previous, item.unit)} | ${item.change == null ? formatAmount(item.delta, item.unit) : dashboardPercent.format(item.change)} |`), "",
    "## Phân tích chuyên đề", "", ...questionSections,
    "## Kết luận", "", ...narrative.conclusions.map(item => "- " + md(item)), "",
    "## Đề xuất hành động", "",
    ...narrative.recommendations.flatMap(item => [
      `- **${md(item.action)}** · Ưu tiên ${priorityNames[item.priority].toLowerCase()}`,
      `  - ${md(item.reason)}`, `  - Đo lường · ${md(item.measure)}`,
    ]), "",
    ...(narrative.limitations.length ? ["## Giới hạn", "", ...narrative.limitations.map(item => "- " + md(item)), ""] : []),
    ...datasetSections,
  ].join("\n");
}

function openDialog(action) {
  if (action === "help") {
    dialogContent.innerHTML = `<h2 id="dialog-title">Cách dùng DataLens</h2>
      <ol><li>Nhập bối cảnh doanh nghiệp và câu hỏi cần phân tích. Thêm các tab Google Sheets, tệp CSV/TSV hoặc dùng dữ liệu mẫu.</li>
      <li>Kiểm tra nguồn, tùy chọn làm sạch và phép tổng hợp ở từng bước.</li>
        <li>Nếu cần sửa, gửi yêu cầu hoặc chỉnh trực tiếp. Xác nhận từng bước để tiếp tục.</li>
      <li>Xác nhận báo cáo để mở tải CSV và Markdown.</li></ol>
      <p>Mỗi phiên dùng tối đa 8 bộ dữ liệu. Giới hạn mỗi bộ là 5 MB, 20.000 dòng, 200 cột và 500.000 ô.</p>
      <div class="dialog-actions"><button class="primary" data-action="close" autofocus>Đã hiểu</button></div>`;
  } else {
    dialogContent.innerHTML = `<h2 id="dialog-title">Tạo phiên mới?</h2>
      <p>Dữ liệu và tùy chọn của phiên hiện tại sẽ được xóa khỏi màn hình.</p>
      <div class="dialog-actions"><button class="secondary" data-action="close" autofocus>Quay lại</button>
      <button class="primary" data-action="confirm-reset">Tạo phiên mới</button></div>`;
  }
  dialog.showModal();
}

function reset(link = "") {
  state.request?.abort();
  Object.assign(state, {
    step: 0, approved: 0, sources: [], active: 0,
    business: emptyBusiness(), businessOutput: null, businessCall: null, evidence: null, intent: "",
  scope: null, dashboardSource: 0, dashboardPeriods: {},
    report: { ...defaultReport }, reportReview: emptyReview(),
    link, busy: false, error: "", request: null,
  });
  render(true);
}

document.addEventListener("submit", event => {
  if (event.target.id === "import-form") void importSheet(event);
  if (event.target.id === "feedback-form") void sendFeedback(event);
});
document.addEventListener("keydown", event => {
  if (event.target.id === "feedback" && !event.isComposing && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    event.target.form.requestSubmit();
  }
});
document.addEventListener("input", event => {
  if (event.target.id === "sheet-link") {
    state.link = event.target.value;
    if (state.error) setImportError("");
  }
  if (event.target.dataset.context) {
    state.business[event.target.dataset.context] = event.target.value;
    state.scope = null;
    const plan = workspace.querySelector(".discovery-plan");
    if (plan) plan.hidden = true;
    const discovery = workspace.querySelector('[data-action="discovery"]');
    const count = questionsFrom(state.business.questions).length;
    discovery.disabled = !(state.business.industry.trim() && count > 0 && count <= 8);
    discovery.lastElementChild.textContent = "Trao đổi yêu cầu";
    if (state.approved) {
      invalidate(0);
      navigationView();
    }
    const approval = workspace.querySelector('[data-action="approve"]');
    if (approval) {
      approval.disabled = !canApprove();
      approval.childNodes[0].textContent = approvalLabel(0) + " ";
    }
  }
  if (event.target.dataset.scopeAnswer !== undefined) {
    state.scope.answers[Number(event.target.dataset.scopeAnswer)] = event.target.value;
    if (state.approved) {
      invalidate(0);
      navigationView();
    }
  }
  if (event.target.dataset.report) {
    const key = event.target.dataset.report;
    const value = event.target.value.trim();
    state.report[key] = key === "title" ? value || defaultReport.title : value;
    const restoreReview = state.approved === 4 || state.reportReview.draft || state.reportReview.blocked || state.reportReview.message || state.reportReview.error;
    invalidate(3);
    clearCurrentReview(3);
    document.querySelector("#view-title").textContent = state.report.title;
    document.querySelector("#report-preview-summary").textContent = state.report.summary || reportFindings().summary;
    if (restoreReview) {
      const card = workspace.querySelector(".review-card");
      const back = card.querySelector("[data-step]").outerHTML;
      card.outerHTML = reviewPanel(back);
      hydrate(workspace.querySelector(".review-card"));
      for (const button of workspace.querySelectorAll('[data-action="csv"], [data-action="report"]')) button.disabled = true;
      workspace.querySelector('[data-action="reset"]')?.remove();
      navigationView();
    }
  }
  if (event.target.id === "feedback") {
    const review = currentReview();
    review.draft = event.target.value;
    if (review.draft.trim() && state.approved > state.step) {
      invalidate(state.step);
      navigationView();
      for (const button of workspace.querySelectorAll('[data-action="csv"], [data-action="report"]')) button.disabled = true;
      const approveButton = workspace.querySelector('[data-action="approve"]');
      approveButton.innerHTML = approvalLabel(state.step) + " " + icon(state.step === 3 ? "check" : "arrow");
      hydrate(approveButton);
    }
    const submit = document.querySelector("#send-feedback");
    submit.className = review.draft.trim() ? "primary" : "secondary";
    submit.querySelector("span:last-child").textContent = review.draft.trim()
      ? "Áp dụng yêu cầu sửa" : "Đề xuất chỉnh sửa";
    document.querySelector("#discard-feedback").hidden = !review.draft.trim() && !review.blocked && !review.error;
    workspace.querySelector('[data-action="approve"]').disabled = !canApprove() || (state.step === 3 && state.approved === 4);
  }
});
window.addEventListener("resize", paintDashboardTrend);

document.addEventListener("change", event => {
  const target = event.target;
  if (state.busy) return;
  if (target.id === "dashboard-source") {
    state.dashboardSource = Number(target.value);
    renderAtCurrentScroll("#dashboard-source");
  } else if (target.id === "dashboard-period") {
    const index = Math.min(state.dashboardSource, state.sources.length - 1);
    state.dashboardPeriods[index] = target.value;
    renderAtCurrentScroll("#dashboard-period");
  } else if (target.id === "csv-file") {
    void importFiles([...target.files]);
  } else if (target.id === "active-source") {
    state.active = Number(target.value);
    renderAtCurrentScroll("#active-source");
  } else if (target.name === "source-headers") {
    state.config.headers = target.checked;
    if (state.scope) state.scope.stale = true;
    invalidate(0);
    clearCurrentReview(0);
    rebuildData();
    renderAtCurrentScroll('[name="source-headers"]');
  } else if (target.name === "clean") {
    state.config[target.value] = target.checked;
    invalidate(1);
    clearCurrentReview(1);
    rebuildData();
    renderAtCurrentScroll(`[name="clean"][value="${target.value}"]`);
  } else if (state.step === 2 && target instanceof HTMLSelectElement) {
    state.analysis[target.name] = ["group", "metric"].includes(target.name) ? Number(target.value) : target.value;
    if (target.name === "locale") refreshProfile();
    invalidate(2);
    state.analysisNote = "";
    clearCurrentReview(2);
    renderAtCurrentScroll(`select[name="${target.name}"]`);
  }
});
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.step !== undefined) {
    const step = Number(button.dataset.step);
    if (step !== state.step) goTo(step);
    return;
  }
  switch (button.dataset.action) {
    case "help": openDialog("help"); break;
    case "reset": state.source || state.busy || state.link ? openDialog("reset") : reset(); break;
    case "close": dialog.close(); break;
    case "confirm-reset": dialog.close(); reset(); break;
    case "file": document.querySelector("#csv-file").click(); break;
    case "sample":
      addSource(demoSales(), { name: "Bán lẻ mẫu", icon: "sample" });
      addSource(parseCSV(sampleMarketing, ","), { name: "Marketing mẫu", icon: "sample" });
      state.active = 0;
      state.business.industry ||= "Bán lẻ đa kênh";
      state.business.questions ||= "Doanh thu theo kênh nào cao nhất?\nChi phí theo chiến dịch nào cao nhất?";
      finishImport();
      break;
    case "remove-source":
      state.sources.splice(state.active, 1);
      state.active = Math.max(0, Math.min(state.active, state.sources.length - 1));
      if (state.scope) state.scope.stale = true;
      invalidate(0);
      finishImport();
      break;
    case "discovery": void reviewBusinessScope(); break;
    case "business-analysis": void analyzeBusiness(); break;
    case "restore-exclusion": {
      const index = Number(button.dataset.exclusion);
      if (state.busy || state.step > 1 || !state.source.exclusions[index]) break;
      const [restored] = state.source.exclusions.splice(index, 1);
      rebuildData();
      invalidate(state.step);
      clearCurrentReview();
      Object.assign(currentReview(), { applied: true, message: `Đã khôi phục mã “${restored.code}”.` });
      renderAtCurrentScroll("#revision-result");
      break;
    }
    case "approve": approve(); break;
    case "discard-feedback":
      clearCurrentReview();
      renderAtCurrentScroll("#feedback");
      break;
    case "csv": {
      const index = Number(button.dataset.source);
      if (state.approved === 4 && state.sources[index]) {
        download(csvOutput(state.sources[index].dataset), "text/csv;charset=utf-8", `datalens-bo-${index + 1}-sach.csv`);
      }
      break;
    }
    case "report":
      if (state.approved === 4) download(reportText(), "text/markdown;charset=utf-8", "datalens-bao-cao.md");
      break;
  }
});

hydrate();
render();
