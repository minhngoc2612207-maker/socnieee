# HỆ THỐNG AI AGENT ĐA NHIỆM DOANH NGHIỆP: PARTNERIQ & DATAIQ
> **Nền tảng Tích hợp Hai Agent Doanh Nghiệp (Multi-Agent Platform):**  
> 1. **PartnerIQ:** Agent Thẩm định & Phát triển Kênh Phân phối Đối tác.  
> 2. **DataIQ:** Agent Chuyên sâu Xử lý & Phân tích Dữ liệu Doanh nghiệp theo Chu trình Tự động hóa Khép kín & Vòng lặp Phản hồi Con người (Human-in-the-Loop).  
> 
> Chạy cục bộ tại: **http://localhost:5000** bằng lệnh `python server.py`.  
> Tài liệu REST API tương tác: **http://localhost:5000/api/docs**.

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC HỆ THỐNG

```
========================================================================================
                                    QUY TRÌNH DATAIQ (B1 - B7)
========================================================================================
[B1: Nhập Bối cảnh, Vấn đề & Tải Tệp thô]
      │
      ▼
[B2: Đọc đa định dạng -> Profiling & Che PII -> Lập Kế hoạch AI -> Chuẩn hóa Xác định]
      │
      ▼
<B3 Cổng quyết định Gatekeeper: Xử lý được không?>
   ├── [NHÁNH KHÔNG (FAILED)]: B4. Báo cáo chẩn đoán lỗi (Tọa độ File/Sheet/Dòng/Cột)
   │                           -> Cho người dùng sửa bối cảnh / tải lại tệp.
   │
   └── [NHÁNH CÓ (READY)]: 
            ├── B5. Dữ liệu sạch + Báo cáo điều hành + Change Log + Rủi ro
            │       ▲
            │       └── ★ MỤC PHẢN HỒI AGENT (Human-in-the-Loop Reprocessing Loop)
            │           (Agent kiểm chứng thực tế -> Báo mâu thuẫn hoặc Tái xử lý v2, v3...)
            │
            ├── B6. Người dùng tự đánh giá kết quả báo cáo (1-5 sao, duyệt từng phát hiện)
            │
            └── B7. Xuất dữ liệu & Báo cáo (Excel đa sheet, PDF thương hiệu, CSV sạch, Email Lãnh đạo)
                 │
                END
```

### Nguyên tắc Bất biến:
1. **Không gắn cứng (Zero Hardcoding):** Không cố định tên công ty, ngành hàng hay số liệu. Toàn bộ ngữ cảnh do người dùng cấu hình; ngưỡng lỗi và quy tắc lấy từ Workspace SQLite.
2. **Tách bạch tính toán & AI:**
   - **Code xác định (pandas, numpy, rapidfuzz):** Đảm nhiệm 100% việc tính toán số học, làm sạch định dạng, phát hiện ngoại lai (IQR), khử trùng lặp và kiểm tra ràng buộc công thức.
   - **Mô hình AI (Google Gemini):** Đảm nhiệm việc hiểu ngữ cảnh kinh doanh, ánh xạ ý nghĩa cột, diễn giải nguyên nhân gốc rễ và soạn thảo báo cáo chiến lược.
   - **Không bịa số liệu:** Mọi con số trong báo cáo đều được gắn mã bằng chứng (Evidence Refs) truy ngược chính xác đến từng tệp, trang tính, dòng và cột của dữ liệu gốc.
3. **Bảo mật dữ liệu nhạy cảm:** Tự động nhận diện và che phủ (masking) các cột Mã số thuế (MST), Số điện thoại (SĐT), Email, Số tài khoản ngân hàng (STK) trước khi gửi bản tóm tắt sang LLM.
4. **Dữ liệu gốc bất biến:** Bản ghi dữ liệu thô ban đầu không bao giờ bị ghi đè hay xóa bỏ. Mọi hiệu chỉnh đều được lưu vết chi tiết trong bảng `change_logs`.

---

## 2. CẤU TRÚC THƯ MỤC MÃ NGUỒN

```
d:\Minh Ngọc BI\
├── server.py                               # Flask Web Server điều phối 2 Agent & 34 REST API endpoints
├── repository.py                           # Wrapper truy cập SQLite repository
├── requirements.txt                        # Danh mục thư viện phụ thuộc
├── config.json                             # Cấu hình API key, model, port
├── README.md                               # Hướng dẫn kiến trúc & kiểm thử
│
├── partneriq/                              # Module lõi hệ sinh thái Agent
│   ├── __init__.py
│   ├── repository.py                       # Quản lý SQLite multi-tenant, schema migrations, audit trail
│   └── core/
│       ├── __init__.py
│       └── data_agent/                     # Module Agent DataIQ (B1 -> B7)
│           ├── __init__.py
│           ├── intake.py                   # B1: Nhận bối cảnh, validate, sinh dữ liệu mẫu có lỗi
│           ├── reader.py                   # B2.1: Đọc đa định dạng (CSV, XLSX, JSON, PDF, DOCX, TXT)
│           ├── profiler.py                 # B2.2: Profiling thống kê, phân phối & che dữ liệu PII
│           ├── planner.py                  # B2.3: Gemini lập kế hoạch xử lý JSON schema + Heuristic fallback
│           ├── processor.py                # B2.4: Code xác định làm sạch, khử trùng (rapidfuzz), IQR, Change Log
│           ├── analyzer.py                 # B2.5: Phân tích theo bài toán, tính KPI, sinh Findings & Chart.js
│           ├── gatekeeper.py               # B3: Cổng quyết định xử lý được/không/một phần theo ngưỡng Workspace
│           ├── error_reporter.py           # B4: Báo cáo chẩn đoán lỗi chi tiết tọa độ, xuất XLSX/PDF
│           ├── feedback_engine.py          # B5: Tiếp nhận phản hồi 3 cấp, tái xử lý có phạm vi, diff, bài học
│           ├── evaluator.py                # B6: Người dùng tự đánh giá kết quả, thống kê chất lượng
│           ├── exporter.py                 # B7: Xuất Excel đa sheet, CSV chống injection, PDF ReportLab
│           └── job_manager.py              # State machine điều phối luồng B1-B7, chạy nền (threads)
│
├── agent/                                  # Module Agent Đối Tác PartnerIQ cũ (Tái sử dụng 100%)
│   ├── compliance_checker.py               # Kiểm tra MST nợ xấu, trần nợ, Geofencing bán kính
│   ├── dossier_generator.py                # Báo cáo thẩm định chiến lược & xuất Excel PartnerIQ
│   ├── extractor.py                        # Bóc tách hồ sơ PDF/Word sang JSON
│   ├── llm_client.py                       # Client gọi Google Gemini REST API v1beta
│   ├── pipeline_manager.py                 # Quản lý hồ sơ đối tác
│   ├── scoring_engine.py                   # Chấm điểm ma trận 100đ, phạt bẫy cam kết ảo
│   └── verification_router.py              # Phiếu thẩm tra liên phòng ban
│
├── data/
│   ├── partneriq.db                        # SQLite multi-tenant Database
│   ├── samples/                            # Thư mục lưu các bộ dữ liệu mẫu có chủ đích lỗi
│   │   ├── scenario_success_retail_sales.xlsx
│   │   ├── scenario_cross_reconciliation_debt.csv
│   │   ├── scenario_corrupted_file.xlsx
│   │   └── scenario_missing_key_columns.csv
│   └── uploads/                            # Thư mục lưu tệp tải lên theo từng phiên làm việc
│
└── templates/
    └── index.html                          # Giao diện Tailwind Dark Luxury, Lucide, Chart.js, Marked.js
```

---

## 3. CƠ SỞ DỮ LIỆU SQLITE MULTI-TENANT (PARTNERIQ.DB)

Tất cả bảng đều có `workspace_id` phục vụ cô lập dữ liệu nhiều doanh nghiệp:
1. `workspaces`: Cấu hình từng không gian làm việc (ngưỡng lỗi Gatekeeper, số vòng lặp tối đa, màu thương hiệu).
2. `users`: Tài khoản và phân quyền (`admin`, `staff`, `viewer`).
3. `audit_logs`: Bảng nhật ký kiểm toán bất biến ghi nhận mọi hành vi người dùng.
4. `data_jobs`: Phiên xử lý dữ liệu (`DRAFT`, `PROCESSING`, `FAILED`, `READY_FOR_REVIEW`, `REPROCESSING`, `REVIEWED`, `EXPORTED`).
5. `data_files`: Danh mục tệp đính kèm phiên.
6. `job_runs`: Các phiên bản xử lý (`v1`, `v2`, `v3`...) lưu snapshot kết quả, kế hoạch, preview và báo cáo.
7. `change_logs`: Lịch sử biến đổi từng ô (Tệp, Sheet, Dòng, Cột, Giá trị cũ, Giá trị mới, Lý do, Nguồn RULE/AI).
8. `findings`: Danh mục phát hiện rủi ro kèm tọa độ bằng chứng (`evidence_refs`).
9. `feedbacks`: Phản hồi con người ở 3 cấp độ (Báo cáo, Phát hiện, Ô dữ liệu).
10. `lessons`: Bài học kinh nghiệm tự động tích lũy từ các phản hồi đã duyệt.
11. `evaluations`: Điểm đánh giá sao, tỷ lệ chấp nhận phát hiện và độ tin cậy của người dùng.
12. `error_reports`: Danh mục lỗi kỹ thuật chi tiết khi kích hoạt Nhánh B4.

---

## 4. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### Bước 1: Cài đặt thư viện
```bash
pip install -r requirements.txt
```

### Bước 2: Cấu hình Gemini API Key (Tùy chọn)
- Mở tệp `config.json` và điền khóa API từ Google AI Studio:
```json
{
  "gemini_api_key": "AIzaSy...",
  "gemini_model": "gemini-2.5-flash",
  "temperature": 0.2,
  "server_port": 5000
}
```
*(Nếu không có API Key, hệ thống tự động kích hoạt chế độ Fallback Xác định / Rule-based Heuristics, toàn bộ các tính năng tính toán, làm sạch và xuất báo cáo vẫn hoạt động bình thường 100%).*

### Bước 3: Khởi chạy máy chủ
```bash
python server.py
```
Mở trình duyệt truy cập: **http://localhost:5000**  
Truy cập tài liệu API: **http://localhost:5000/api/docs**

---

## 5. HƯỚNG DẪN KIỂM THỬ 4 KỊCH BẢN TRỌNG TÂM

### Kịch bản (a): Nhánh Thành Công (Happy Path)
*Mục tiêu: Tải tệp có lỗi định dạng, trùng lặp và ngoại lai -> nhận dữ liệu sạch, Change Log và báo cáo điều hành.*
1. Tại giao diện chính DataIQ, bấm nút **"Nạp Mẫu Có Sẵn"** ở góc trên.
2. Chọn mẫu số 1: **"Dữ liệu Bán hàng & Đại lý (Có lỗi thực tế)"** (`scenario_success_retail_sales.xlsx`) -> bấm **"Nạp Nhanh & Chạy Thử Ngay"**.
3. **Quan sát tiến trình (B2):** Thanh tiến trình hiển thị thời gian thực qua các bước: *Đọc tệp -> Profiling & Che PII -> Lập kế hoạch -> Gatekeeper -> Chuẩn hóa định dạng -> Phân tích rủi ro -> Soạn thảo báo cáo*.
4. **Kết quả (B5):**
   - **Báo cáo điều hành:** Hiển thị doanh thu sổ sách ban đầu (10.3 tỷ đ) vs Doanh thu thực tế sau làm sạch (216.2 triệu đ), tách riêng khoản ngoại lai méo mó (10.1 tỷ đ).
   - **Tab Dữ liệu đã xử lý:** Bảng dữ liệu tương tác, ô ngoại lai và trùng lặp được gắn nhãn nổi bật.
   - **Tab Change Log:** 16 thao tác hiệu chỉnh (chuẩn hóa ngày `31/02`, định dạng tiền tệ, số điện thoại, MST, điền giá trị thiếu, gắn cờ trùng lặp).
   - **Tab Phát hiện & Rủi ro:** 3 phát hiện trọng yếu kèm mã bằng chứng và biểu đồ Chart.js.

---

### Kịch bản (b): Nhánh Lỗi (Error Diagnostics - B4)
*Mục tiêu: Tải tệp hỏng cấu trúc hoặc thiếu cột then chốt -> Gatekeeper từ chối và cung cấp bảng chẩn đoán lỗi chi tiết.*
1. Bấm nút **"Nạp Mẫu Có Sẵn"** -> chọn mẫu số 3: **"Tệp lỗi cấu trúc hỏng"** (`scenario_corrupted_file.xlsx`) hoặc mẫu số 4: **"Tệp thiếu cột then chốt"** (`scenario_missing_key_columns.csv`).
2. Bấm **"Nạp Nhanh & Chạy Thử Ngay"**.
3. **Cổng Gatekeeper thẩm định:** Phát hiện lỗi nghiêm trọng (Blocker) -> chuyển ngay sang màn hình **Chẩn Đoán Sự Cố Dữ Liệu (Nhánh B4)**.
4. **Quan sát kết quả:**
   - Bảng chẩn đoán hiển thị rõ: Mã lỗi (`ERR_FILE_CORRUPT` hoặc `ERR_MISSING_KEY_COLUMNS`), Mức độ `BLOCKER`, Tên tệp, Dòng, Cột, Nguyên nhân và Đề xuất khắc phục cụ thể.
   - Không xuất hiện bất kỳ dòng stack trace lập trình thô nào.
   - Bấm nút **"Tải Báo Cáo Lỗi (.xlsx)"** để tải tệp chẩn đoán Excel về máy.
   - Bấm nút **"Tải Lại Tệp Mới Hoặc Sửa Mô Tả Cột"** để khởi động lại phiên.

---

### Kịch bản (c): Vòng Phản Hồi Agent & Tái Xử Lý Có Phạm Vi (Feedback Loop & Scoped Reprocessing)
*Mục tiêu: Người dùng phản hồi "cột X là doanh thu chưa VAT, Agent hiểu sai" -> Agent tái xử lý và xuất bản phiên bản v2 kèm Diff và Bài học kinh nghiệm.*
1. Mở phiên làm việc thành công từ Kịch bản (a).
2. Chuyển sang tab **"5. PHẢN HỒI AGENT"**.
3. Tại form phản hồi:
   - Cấp độ: Chọn `Cả báo cáo`.
   - Loại sai sót: Chọn `Hiểu sai ý nghĩa cột`.
   - Mô tả vấn đề: Nhập *"Cột Doanh thu thuần là số tiền bán hàng thực tế chưa bao gồm 10% VAT, Agent cần lưu ý khi tính thuế"*.
   - Bấm **"Thêm Phản Hồi Này Vào Hàng Đợi"**.
4. *(Tùy chọn)* Chuyển sang tab **"2. Dữ Liệu Đã Xử Lý"**, **bấm chuột trực tiếp vào một ô bất kỳ trong bảng** (ví dụ ô Thành tiền ở dòng 3) -> popup mở ra với tọa độ điền sẵn -> nhập giá trị mong muốn -> bấm **"Lưu Phản Hồi"**.
5. Bấm nút lớn: **"Gửi Phản Hồi & Để Agent Xử Lý Lại"**.
6. **Quan sát kết quả tái xử lý:**
   - Hệ thống tự động nâng cấp phiên bản lên **v2.0**.
   - Hộp thông báo **"Tổng kết tái xử lý theo chỉ đạo của bạn"** hiển thị rõ những gì Agent đã tiếp thu.
   - Bảng **So Sánh Khác Biệt Giữa Các Phiên Bản (Version Diff)** hiển thị độ lệch doanh thu và phát hiện giữa v1 và v2.
   - Vào menu bên trái **"Bài Học Tích Lũy"**: Kiểm tra thấy phản hồi đã được lưu thành Bài học mới của Workspace, sẵn sàng áp dụng cho các phiên chạy tương lai.

---

### Kịch bản (d): Phản Hồi Mâu Thuẫn Dữ Liệu Thực Tế & Ghi Đè Thủ Công (Reality Check & Force Override)
*Mục tiêu: Người dùng khẳng định điều mâu thuẫn với số liệu trong tệp -> Agent từ chối tiếp thu máy móc, đưa ra bằng chứng đối chất và cho phép người dùng ghi đè có lưu vết kiểm toán.*
1. Tại tab **"5. PHẢN HỒI AGENT"** của phiên đang xem, nhập phản hồi có chủ ý mâu thuẫn với dữ liệu gốc:
   - Mô tả: *"Tổng doanh thu của file phải là 80 tỷ đồng chứ không phải 216 triệu"* (hoặc phản hồi ô tại dòng 1: *"File gốc ghi giá trị là 999 triệu chứ không phải 32.5 triệu"*).
   - Bấm **"Thêm Phản Hồi"** -> bấm **"Gửi Phản Hồi & Để Agent Xử Lý Lại"**.
2. **Agent kiểm chứng thực tế:**
   - Agent **KHÔNG** nhận phản hồi một cách máy móc.
   - Trạng thái phản hồi chuyển sang: `REJECTED_CONFLICT`.
   - Hộp cảnh báo đỏ bật lên: *"Phát hiện mâu thuẫn giữa phản hồi và dữ liệu thực tế: Tổng cộng toàn bộ các dòng trong tệp chỉ đạt số tiền thực tế X, khác biệt lớn so với con số 80 tỷ trong phản hồi (kèm tọa độ dòng/cột chứng minh)"*.
3. **Cưỡng chế ghi đè (Human Force Override):**
   - Bấm nút **"Áp Dụng Theo Ý Tôi (Ghi Đè Thủ Công & Lưu Audit)"**.
   - Nhập lý do: *"Đã được Kế toán trưởng ký duyệt bù trừ công nợ ngoài sổ"*.
   - Hệ thống chấp nhận ghi đè, tạo phiên bản **v3.0**, và tự động ghi sự kiện `FORCE_OVERRIDE` vào menu **"Nhật Ký Kiểm Toán (Audit Trail)"** để phục vụ thanh tra sau này.

---

### Bàn Giao & Nghiệm Thu (B6 & B7):
1. Chuyển sang tab **"6. Đánh Giá Báo Cáo"**: Chấm 5 sao, chọn Chấp nhận cho các phát hiện chính, kéo thanh độ tin cậy lên 95% -> bấm **"Hoàn Tất Đánh Giá & Chuyển Sang Xuất Báo Cáo"** (trạng thái chuyển `REVIEWED`).
2. Chuyển sang tab **"7. Xuất Kết Quả"**:
   - Tải tệp Excel Workbook đa sheet chuẩn nhận diện thương hiệu.
   - Tải Báo cáo PDF điều hành chuẩn ReportLab.
   - Tải CSV sạch chống CSV Injection.
   - Xem và sao chép **Bản Soạn Thảo Email Gửi Lãnh Đạo** do Gemini soạn thảo bám sát các số liệu đã được kiểm duyệt.
