"""
Comprehensive End-to-End Test Suite for PartnerIQ & DataIQ.
Validates all 4 requested scenarios:
(a) Success branch: dirty sample -> clean data + change logs + findings + executive report
(b) Error branch: corrupted/missing key columns -> Gatekeeper blocker + structured error coordinates
(c) Feedback loop: feedback applied -> scoped reprocessing -> v2 + diff + lesson learned
(d) Reality check: conflicting feedback -> detected & rejected with evidence -> force override + audit trail
(e) B6 & B7: Evaluation + Multi-format exports (XLSX, PDF, CSV sanitized, JSON, Email draft)
"""

import os
import sys
import time
import json
import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import partneriq.repository as repo
from partneriq.core.data_agent.intake import ensure_sample_files, get_sample_manifest, validate_intake_payload
from partneriq.core.data_agent.reader import read_all_job_files, read_data_file
from partneriq.core.data_agent.profiler import profile_all_datasets
from partneriq.core.data_agent.planner import create_processing_plan
from partneriq.core.data_agent.gatekeeper import evaluate_gatekeeper_decision
from partneriq.core.data_agent.error_reporter import export_error_report_to_excel
from partneriq.core.data_agent.processor import execute_data_processing
from partneriq.core.data_agent.analyzer import analyze_business_data, generate_executive_report
from partneriq.core.data_agent.feedback_engine import execute_scoped_reprocessing, verify_feedback_against_ground_truth
from partneriq.core.data_agent.evaluator import submit_user_evaluation
from partneriq.core.data_agent.exporter import (
    export_clean_data_to_csv, export_to_multisheet_excel,
    export_executive_report_to_pdf, generate_executive_email_draft
)
from partneriq.core.data_agent.job_manager import start_job_pipeline_async, cancel_job


class TestDataIQEndToEnd(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.samples_dir = os.path.join(BASE_DIR, "data", "samples")
        ensure_sample_files(cls.samples_dir)
        repo.init_db()

    def test_01_scenario_a_success_branch(self):
        """Kịch bản (a): Nhánh thành công với file chứa lỗi thực tế."""
        print("\n--- [TEST] Kịch bản (a): Nhánh Thành Công ---")
        job_id = f"test-scen-a-{int(time.time())}"
        sample_path = os.path.join(self.samples_dir, "scenario_success_retail_sales.xlsx")

        job = repo.create_job(
            job_id=job_id,
            workspace_id="ws-default",
            title="Kiểm thử Kịch bản A - Thành công",
            problem_statement="Doanh thu đại lý bị trùng lặp, nghi ngờ số tiền tính sai chiết khấu và có giao dịch ngoại lai.",
            business_context={"industry": "Gia dụng", "scale": "Vừa", "business_model": "B2B"},
            goals=["clean_data", "detect_anomalies", "find_root_causes"],
            column_descriptions={"Thanh_Tien": "Doanh thu sau chiết khấu"}
        )

        repo.add_data_file(
            file_id=f"f-scen-a-{int(time.time()*1000)}",
            job_id=job_id,
            workspace_id="ws-default",
            filename="scenario_success_retail_sales.xlsx",
            original_filename="scenario_success_retail_sales.xlsx",
            file_path=sample_path,
            file_type="xlsx",
            file_size=os.path.getsize(sample_path)
        )

        # Run pipeline asynchronously and wait for completion
        start_job_pipeline_async(job_id)
        
        # Poll until finished
        for _ in range(20):
            time.sleep(0.5)
            j = repo.get_job(job_id)
            if j.get("status") in ["READY_FOR_REVIEW", "FAILED"]:
                break

        final_job = repo.get_job(job_id)
        self.assertEqual(final_job.get("status"), "READY_FOR_REVIEW")
        self.assertEqual(final_job.get("progress_percent"), 100)

        run = repo.get_latest_run(job_id)
        self.assertIsNotNone(run)
        self.assertEqual(run.get("version"), 1)

        findings = repo.get_findings(run["id"])
        self.assertGreaterEqual(len(findings), 2)
        print(f"  -> Số phát hiện rủi ro: {len(findings)}")

        change_logs = repo.get_change_logs(run["id"])
        self.assertGreaterEqual(len(change_logs), 5)
        print(f"  -> Số thao tác làm sạch (Change Log): {len(change_logs)}")

        preview = run.get("clean_data_preview", {})
        kpis = preview.get("kpis", {})
        self.assertGreater(kpis.get("raw_total_revenue", 0), kpis.get("adjusted_revenue", 0))
        print(f"  -> Doanh thu ban đầu: {kpis.get('raw_total_revenue'):,.0f} đ")
        print(f"  -> Doanh thu thực tế sau làm sạch: {kpis.get('adjusted_revenue'):,.0f} đ")
        print("  -> KỊCH BẢN (A) PASS THÀNH CÔNG!")

    def test_02_scenario_b_error_branch(self):
        """Kịch bản (b): Nhánh lỗi với tệp hỏng cấu trúc."""
        print("\n--- [TEST] Kịch bản (b): Nhánh Lỗi (Gatekeeper B4) ---")
        job_id = f"test-scen-b-{int(time.time())}"
        corrupt_path = os.path.join(self.samples_dir, "scenario_corrupted_file.xlsx")

        job = repo.create_job(
            job_id=job_id,
            workspace_id="ws-default",
            title="Kiểm thử Kịch bản B - Tệp hỏng",
            problem_statement="Kiểm thử khả năng phát hiện lỗi tự động của Gatekeeper khi tệp bị hỏng.",
            business_context={},
            goals=["clean_data"],
            column_descriptions={}
        )

        repo.add_data_file(
            file_id=f"f-scen-b-{int(time.time()*1000)}",
            job_id=job_id,
            workspace_id="ws-default",
            filename="scenario_corrupted_file.xlsx",
            original_filename="scenario_corrupted_file.xlsx",
            file_path=corrupt_path,
            file_type="xlsx",
            file_size=os.path.getsize(corrupt_path)
        )

        start_job_pipeline_async(job_id)

        for _ in range(20):
            time.sleep(0.5)
            j = repo.get_job(job_id)
            if j.get("status") in ["FAILED", "READY_FOR_REVIEW"]:
                break

        final_job = repo.get_job(job_id)
        self.assertEqual(final_job.get("status"), "FAILED")
        print(f"  -> Trạng thái: {final_job.get('status')}")

        errors = repo.get_error_reports(job_id)
        self.assertGreaterEqual(len(errors), 1)
        err = errors[0]
        self.assertEqual(err.get("severity"), "BLOCKER")
        print(f"  -> Mã lỗi chặn: {err.get('error_code')}, Nguyên nhân: {err.get('cause')}")

        # Test Excel error export
        err_buf = export_error_report_to_excel(errors, "Test Corrupt Job")
        self.assertGreater(len(err_buf.getvalue()), 1000)
        print("  -> KỊCH BẢN (B) PASS THÀNH CÔNG!")

    def test_03_scenario_c_feedback_loop_and_lessons(self):
        """Kịch bản (c): Vòng phản hồi, tạo v2, diff và lưu Bài học kinh nghiệm."""
        print("\n--- [TEST] Kịch bản (c): Vòng Phản Hồi Agent (Scoped Reprocessing) ---")
        job_id = f"test-scen-c-{int(time.time())}"
        sample_path = os.path.join(self.samples_dir, "scenario_success_retail_sales.xlsx")

        job = repo.create_job(
            job_id=job_id,
            workspace_id="ws-default",
            title="Kiểm thử Kịch bản C - Phản hồi v1 -> v2",
            problem_statement="Đối soát doanh thu bán hàng.",
            business_context={"industry": "Gia dụng"},
            goals=["clean_data"],
            column_descriptions={}
        )

        repo.add_data_file(
            file_id=f"f-scen-c-{int(time.time()*1000)}",
            job_id=job_id,
            workspace_id="ws-default",
            filename="scenario_success_retail_sales.xlsx",
            original_filename="scenario_success_retail_sales.xlsx",
            file_path=sample_path,
            file_type="xlsx",
            file_size=os.path.getsize(sample_path)
        )

        # Run v1
        start_job_pipeline_async(job_id)
        for _ in range(20):
            time.sleep(0.5)
            j = repo.get_job(job_id)
            if j.get("status") == "READY_FOR_REVIEW":
                break

        # Submit Feedback: "cột Doanh thu thuần là số tiền chưa VAT, Agent hiểu sai"
        fb_payload = {
            "job_id": job_id,
            "run_id": f"{job_id}-v1",
            "workspace_id": "ws-default",
            "user_id": "staff",
            "level": "REPORT",
            "target_ref": "col:Thanh_Tien",
            "error_category": "Hiểu sai ý nghĩa cột",
            "user_comment": "Cột Thanh_Tien là số tiền bán lẻ thực tế chưa bao gồm 10% VAT, Agent cần ghi nhận vào bài học kinh nghiệm.",
            "expected_value": "Doanh thu chưa VAT",
            "priority": "HIGH"
        }

        reproc_res = execute_scoped_reprocessing(
            job_id=job_id,
            feedbacks_list=[fb_payload],
            workspace_id="ws-default",
            user_name="staff"
        )

        self.assertTrue(reproc_res.get("success"))
        self.assertEqual(reproc_res.get("new_version"), 2)
        print(f"  -> Đã tạo thành công phiên bản mới: v{reproc_res.get('new_version')}")

        diff = reproc_res.get("diff", {})
        self.assertIn("kpi_diff", diff)
        print(f"  -> Tóm tắt Diff phiên bản: {diff.get('version_comparison', {}).get('summary_message')}")

        # Check lessons learned
        lessons = repo.get_active_lessons("ws-default")
        self.assertTrue(any("chưa bao gồm" in l.get("rule_content", "") or "Thanh_Tien" in l.get("rule_key", "") for l in lessons))
        print(f"  -> Đã lưu Bài học kinh nghiệm mới vào Workspace (Tổng số bài học: {len(lessons)})")
        print("  -> KỊCH BẢN (C) PASS THÀNH CÔNG!")

    def test_04_scenario_d_conflict_and_force_override(self):
        """Kịch bản (d): Phản hồi mâu thuẫn dữ liệu gốc -> từ chối -> người dùng ghi đè thủ công."""
        print("\n--- [TEST] Kịch bản (d): Đối Chất Dữ Liệu Gốc & Ghi Đè Thủ Công ---")
        job_id = f"test-scen-d-{int(time.time())}"
        sample_path = os.path.join(self.samples_dir, "scenario_success_retail_sales.xlsx")

        job = repo.create_job(
            job_id=job_id,
            workspace_id="ws-default",
            title="Kiểm thử Kịch bản D - Mâu thuẫn & Override",
            problem_statement="Kiểm thử đối chất số liệu thực tế.",
            business_context={},
            goals=["clean_data"],
            column_descriptions={}
        )

        repo.add_data_file(
            file_id=f"f-scen-d-{int(time.time()*1000)}",
            job_id=job_id,
            workspace_id="ws-default",
            filename="scenario_success_retail_sales.xlsx",
            original_filename="scenario_success_retail_sales.xlsx",
            file_path=sample_path,
            file_type="xlsx",
            file_size=os.path.getsize(sample_path)
        )

        start_job_pipeline_async(job_id)
        for _ in range(20):
            time.sleep(0.5)
            j = repo.get_job(job_id)
            if j.get("status") == "READY_FOR_REVIEW":
                break

        # Submit contradictory feedback: asserts total revenue must be 90 billion VND
        conflict_fb = {
            "job_id": job_id,
            "run_id": f"{job_id}-v1",
            "workspace_id": "ws-default",
            "user_id": "staff",
            "level": "REPORT",
            "error_category": "Tính toán sai",
            "user_comment": "Tổng doanh thu phải là 90 tỷ đồng chứ không phải 216 triệu, Agent tính thiếu",
            "expected_value": "90,000,000,000",
            "priority": "HIGH"
        }

        # Step 1: Reprocess should detect CONFLICT and reject
        reproc_res = execute_scoped_reprocessing(
            job_id=job_id,
            feedbacks_list=[conflict_fb],
            workspace_id="ws-default",
            user_name="staff"
        )
        self.assertEqual(reproc_res.get("conflict_count"), 1)
        conf = reproc_res.get("conflicts")[0]
        print(f"  -> Agent phát hiện mâu thuẫn: {conf.get('reason')}")
        self.assertIn("Mâu thuẫn", conf.get("reason"))

        # Step 2: User clicks Force Override
        fb_id = conf.get("feedback_id")
        repo.update_feedback_status(
            feedback_id=fb_id,
            status="OVERRIDDEN",
            resolution_notes="Người dùng xác nhận ghi đè thủ công theo nghiệp vụ nội bộ."
        )
        repo.log_audit(
            workspace_id="ws-default",
            action="FORCE_OVERRIDE",
            target_type="FEEDBACK",
            target_id=fb_id,
            user_name="staff",
            details="Người dùng cưỡng chế áp dụng phản hồi mâu thuẫn."
        )

        override_res = execute_scoped_reprocessing(
            job_id=job_id,
            feedbacks_list=[conflict_fb],
            workspace_id="ws-default",
            trigger_type="OVERRIDE",
            user_name="staff"
        )
        self.assertTrue(override_res.get("success"))
        print(f"  -> Đã thực thi ghi đè thủ công và tạo phiên bản v{override_res.get('new_version')}")

        # Check audit trail
        logs = repo.get_audit_logs("ws-default", limit=10)
        self.assertTrue(any(a.get("action") == "FORCE_OVERRIDE" for a in logs))
        print("  -> Sự kiện FORCE_OVERRIDE đã được ghi vào Audit Trail!")
        print("  -> KỊCH BẢN (D) PASS THÀNH CÔNG!")

    def test_05_b6_evaluation_and_b7_exports(self):
        """Kiểm thử B6 Đánh giá nghiệm thu & B7 Xuất các định dạng (XLSX, PDF, CSV, JSON, Email draft)."""
        print("\n--- [TEST] B6 Nghiệm Thu & B7 Xuất Dữ Liệu Đa Định Dạng ---")
        job_id = f"test-scen-e-{int(time.time())}"
        sample_path = os.path.join(self.samples_dir, "scenario_success_retail_sales.xlsx")

        job = repo.create_job(
            job_id=job_id,
            workspace_id="ws-default",
            title="Kiểm thử B6 & B7 Export",
            problem_statement="Xuất báo cáo điều hành và bàn giao.",
            business_context={},
            goals=["clean_data"],
            column_descriptions={}
        )

        repo.add_data_file(
            file_id=f"f-scen-e-{int(time.time()*1000)}",
            job_id=job_id,
            workspace_id="ws-default",
            filename="scenario_success_retail_sales.xlsx",
            original_filename="scenario_success_retail_sales.xlsx",
            file_path=sample_path,
            file_type="xlsx",
            file_size=os.path.getsize(sample_path)
        )

        start_job_pipeline_async(job_id)
        for _ in range(20):
            time.sleep(0.5)
            j = repo.get_job(job_id)
            if j.get("status") == "READY_FOR_REVIEW":
                break

        # B6: Submit user evaluation
        eval_res = submit_user_evaluation(
            job_id=job_id,
            run_id=f"{job_id}-v1",
            rating_stars=5,
            findings_decisions={"FIND-001": "ACCEPTED", "FIND-002": "ACCEPTED"},
            confidence_score=98,
            general_notes="Báo cáo phân tích rất chính xác, số liệu bám sát dữ liệu gốc.",
            workspace_id="ws-default",
            user_name="staff"
        )
        self.assertTrue(eval_res.get("success"))
        self.assertEqual(eval_res.get("status"), "REVIEWED")
        print("  -> B6 Đánh giá người dùng hoàn tất: Trạng thái REVIEWED")

        # B7: Multi-format exports
        # (1) Sanitized CSV
        import pandas as pd
        df_sample = pd.DataFrame([{"Ten": "Ánh Dương", "Lenh": "=CMD('calc')", "Tien": 15000000}])
        csv_buf = export_clean_data_to_csv(df_sample)
        csv_text = csv_buf.getvalue().decode("utf-8-sig")
        self.assertIn("'=CMD('calc')", csv_text)  # Escaped!
        print("  -> B7 CSV: Chống CSV Injection thành công (đã escape '=')")

        # (2) Multi-sheet Excel
        xl_buf = export_to_multisheet_excel(
            clean_datasets={"Clean": df_sample},
            change_logs=[{"file_name": "f.xlsx", "sheet_name": "S1", "row_index": 1, "col_name": "Tien", "old_value": "15,000,000 đ", "new_value": 15000000, "change_type": "FORMAT", "reason": "Test", "source": "RULE"}],
            findings=[{"id": "FIND-001", "title": "Test", "severity": "HIGH", "category": "ANOMALY", "description": "Test", "impact_estimate": "0", "recommendation": "Test"}],
            job_title="Test Export"
        )
        self.assertGreater(len(xl_buf.getvalue()), 5000)
        print(f"  -> B7 Excel: Xuất đa sheet thành công ({len(xl_buf.getvalue()):,} bytes)")

        # (3) ReportLab PDF
        pdf_buf = export_executive_report_to_pdf(job_id=job_id, run_id=f"{job_id}-v1", workspace_id="ws-default")
        self.assertGreater(len(pdf_buf.getvalue()), 2000)
        print(f"  -> B7 PDF: Xuất báo cáo thương hiệu thành công ({len(pdf_buf.getvalue()):,} bytes)")

        # (4) Gemini Executive Email Draft
        email_draft = generate_executive_email_draft(job_id=job_id, run_id=f"{job_id}-v1", user_name="Nguyễn Văn An")
        self.assertGreater(len(email_draft), 100)
        print("  -> B7 Email Draft:\n" + "\n".join("     " + l for l in email_draft.split("\n")[:4]))

        # Update status to EXPORTED
        repo.update_job_status(job_id, "EXPORTED", "Hoàn tất bàn giao")
        j_final = repo.get_job(job_id)
        self.assertEqual(j_final.get("status"), "EXPORTED")
        print("  -> B7 Bàn giao EXPORTED thành công!")
        print("  -> TẤT CẢ 5 BÀI TEST ĐỀU ĐẠT CHUẨN 100%!")


if __name__ == "__main__":
    unittest.main()
