"""
Generates sample .pdf and .docx application dossier files for testing Dual-Mode Intake.
"""

import os
import docx
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sample_files")
os.makedirs(SAMPLE_DIR, exist_ok=True)


def create_sample_1_pdf():
    """Hồ sơ Chuẩn Tier A - Minh Quang Đà Nẵng"""
    path = os.path.join(SAMPLE_DIR, "ho_so_dai_ly_chuan_tier_a.pdf")
    c = canvas.Canvas(path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "HO SO DANG KY DAI LY PHAN PHOI - DAI THANH GROUP")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 725, "1. THONG TIN PHAP NHAN & NGUOI DAI DIEN:")
    c.setFont("Helvetica", 10)
    lines = [
        "Ten phap nhan: Cong ty TNHH Thuong Mai & Ky Thuat Minh Quang",
        "Ma so thue (MST): 0402123456",
        "Nguoi dai dien phap luat: Tran Minh Quang",
        "Dien thoai: 0905999888",
        "Email: minhquang.danang@gmail.com",
        "Nam thanh lap: 2018 | Von dieu le: 6,000,000,000 VND | Khu vuc: KV2 (Mien Trung)",
        "",
        "2. DIA DIEM, TOA DO GPS & CO SO VAT CHAT:",
        "Dia chi: 450 Dien Bien Phu, Phuong Thanh Khe Dong, Quan Thanh Khe, Da Nang",
        "Toa do GPS: Lat 16.0685, Long 108.1895",
        "Mat tien: 12m | Dien tich kho: 200 m2 | Xe tai 5 tan vao tan kho",
        "",
        "3. CAM KET THUONG MAI:",
        "Doanh so cam ket: 1,400,000,000 VND/thang (1.4 ty/thang)",
        "Nganh hang: Bep tu cao cap, May loc nuoc RO, Binh nuoc nong",
        "Kenh ban hang: Dai ly cap 2, Du an can ho, Ban le",
        "Kinh nghiem nganh gia dung: 6 nam",
        "",
        "4. DICH VU KY THUAT & TRAM BAO HANH:",
        "So luong tho ky thuat (KTV) co huu: 3 tho co chung chi nghe dien",
        "Dien tich xuong sua chua bao hanh: 35 m2",
        "Cam ket thoi gian xu ly SLA: Trong vong 24 gio",
        "Co san ke ton tru linh kien thay the chinh hang",
        "",
        "5. DE XUAT CONG NO & TIN DUNG:",
        "Han muc tin dung de xuat: 500,000,000 VND (500 trieu)",
        "Thoi han no: 30 ngay",
        "Co Thu bao lanh thanh toan Ngan hang Vietcombank Da Nang"
    ]
    y = 705
    for l in lines:
        if l.startswith(("2.", "3.", "4.", "5.")):
            c.setFont("Helvetica-Bold", 12)
            y -= 8
            c.drawString(50, y, l)
            c.setFont("Helvetica", 10)
        else:
            c.drawString(50, y, l)
        y -= 18
    c.save()
    print("Created:", path)


def create_sample_2_docx():
    """Hồ sơ Bẫy Cam Kết Ảo - Tân Phát Gia Dụng (Cam kết 2.5 tỷ, 0 thợ, nợ 60 ngày)"""
    path = os.path.join(SAMPLE_DIR, "ho_so_bay_cam_ket_ao.docx")
    doc = docx.Document()
    doc.add_heading("HỒ SƠ ĐĂNG KÝ PHÂN PHỐI ĐỘC QUYỀN - TÂN PHÁT APPLIANCE", level=1)

    p1 = doc.add_paragraph()
    p1.add_run("Kính gửi: ").bold = True
    p1.add_run("Ban Giám đốc Công ty Cổ phần Thiết bị Gia dụng Đại Thành\n")
    p1.add_run("Chúng tôi xin gửi bản đăng ký hạn mức đại lý phân phối với các thông tin sau:")

    doc.add_heading("I. THÔNG TIN DOANH NGHIỆP", level=2)
    doc.add_paragraph("Tên công ty: Công ty Cổ phần Thương mại Tổng hợp Tân Phát")
    doc.add_paragraph("Mã số thuế: 0109887766")
    doc.add_paragraph("Người đại diện: Lê Văn Phát (Chức vụ: Tổng Giám đốc)")
    doc.add_paragraph("Số điện thoại: 0915667788 | Email: tanphat.appliance@gmail.com")
    doc.add_paragraph("Địa chỉ: 88 Đường Tam Trinh, Phường Yên Sở, Quận Hoàng Mai, Hà Nội (Khu vực KV1)")
    doc.add_paragraph("Tọa độ GPS: 20.9850, 105.8650 | Mặt tiền: 7m | Kho: 90 m2")

    doc.add_heading("II. ĐỀ XUẤT DOANH SỐ & CHÍNH SÁCH CÔNG NỢ", level=2)
    doc.add_paragraph("Doanh thu cam kết: 2,500,000,000 VNĐ/tháng (2.5 tỷ/tháng - mức cao nhất toàn quốc)")
    doc.add_paragraph("Sản phẩm đăng ký: Toàn bộ dải Bếp từ, Bình nước nóng, Máy lọc nước và Quạt điều hòa")
    doc.add_paragraph("Đề xuất hạn mức công nợ: 1,200,000,000 VNĐ (1.2 tỷ đồng tín chấp)")
    doc.add_paragraph("Thời hạn nợ gối đầu yêu cầu: 60 ngày kể từ ngày xuất hóa đơn")
    doc.add_paragraph("Bảo lãnh ngân hàng: Chưa có (xin áp dụng chính sách tín chấp dựa trên uy tín doanh số)")

    doc.add_heading("III. NĂNG LỰC DỊCH VỤ & KỸ THUẬT", level=2)
    doc.add_paragraph("Số lượng thợ kỹ thuật cơ hữu: 0 thợ (Doanh nghiệp tập trung 100% nhân lực vào bán hàng và phát triển kênh, đề nghị Đại Thành cử trung tâm bảo hành của hãng trực tiếp hỗ trợ sửa chữa bảo trì cho khách hàng).")
    doc.add_paragraph("Diện tích trạm xưởng bảo hành: 0 m2 (chỉ làm kho chứa hàng)")
    doc.add_paragraph("Cam kết SLA: Tiếp nhận thông tin phản hồi trong 72 giờ và chuyển tiếp về tổng đài hãng.")

    doc.save(path)
    print("Created:", path)


def create_sample_3_pdf():
    """Hồ sơ Xung Đột Địa Bàn - Điện Máy Sao Mai Cầu Giấy (Cách 1.2km)"""
    path = os.path.join(SAMPLE_DIR, "ho_so_xung_dot_dia_ban.pdf")
    c = canvas.Canvas(path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "GIAY DANG KY PHAN PHOI GIA DUNG DAI THANH")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 725, "THONG TIN DIEM BAN VA DAI LY DE XUAT:")
    c.setFont("Helvetica", 10)
    lines = [
        "Ten don vi: Cong ty TNHH Dien May Sao Mai",
        "Ma so thue: 0108771122",
        "Nguoi dai dien: Hoang Sao Mai - Dien thoai: 0904332211",
        "Dia chi diem ban: 250 Duong Cau Giay, Phuong Dich Vong, Quan Cau Giay, Ha Noi",
        "Toa do GPS: Lat 21.0345, Long 105.7980",
        "Khu vuc: KV1 (Ha Noi)",
        "",
        "QUY MO VA NANG LUC:",
        "Mat tien cua hang: 9m truc duong chinh Cau Giay",
        "Dien tich kho chua: 110 m2",
        "Doanh so cam ket: 1,000,000,000 VND/thang (1.0 ty)",
        "Nhan su ky thuat: 2 tho KTV co huu",
        "Dien tich tram bao hanh: 20 m2, cam ket SLA trong 48h",
        "",
        "DE XUAT CONG NO:",
        "Han muc cong no: 400,000,000 VND",
        "Thoi han no: 30 ngay",
        "Luu y: Diem ban nam tai truc duong Cau Giay (Cach Dai ly Cap 1 A Chau chi khoang 1.2 km)"
    ]
    y = 705
    for l in lines:
        if l.startswith(("THONG", "QUY", "DE")):
            c.setFont("Helvetica-Bold", 12)
            y -= 8
            c.drawString(50, y, l)
            c.setFont("Helvetica", 10)
        else:
            c.drawString(50, y, l)
        y -= 18
    c.save()
    print("Created:", path)


def create_sample_4_docx():
    """Hồ sơ Nợ Xấu / Trùng MST Blacklist - Toàn Cầu Tech"""
    path = os.path.join(SAMPLE_DIR, "ho_so_no_xau_trung_mst.docx")
    doc = docx.Document()
    doc.add_heading("ĐƠN ĐĂNG KÝ HỢP TÁC ĐẠI LÝ MỚI - NĂM 2026", level=1)

    doc.add_paragraph("Kính gửi Ban Phát triển Kinh doanh Đại Thành Group")
    doc.add_heading("1. Pháp nhân đăng ký", level=2)
    doc.add_paragraph("Tên công ty: Công ty TNHH Đầu Tư Toàn Cầu Mới")
    doc.add_paragraph("Mã số thuế: 0108999888 (Lưu ý: Trùng khớp mã số thuế đơn vị nợ xấu)")
    doc.add_paragraph("Đại diện pháp luật: Nguyễn Văn Thắng")
    doc.add_paragraph("Số điện thoại: 0912345678")
    doc.add_paragraph("Địa chỉ: 15 Đường Giải Phóng, Phường Đồng Tâm, Quận Hai Bà Trưng, Hà Nội")

    doc.add_heading("2. Năng lực & Đề xuất", level=2)
    doc.add_paragraph("Doanh số cam kết: 1,200,000,000 VNĐ/tháng")
    doc.add_paragraph("Hạn mức công nợ đề xuất: 600,000,000 VNĐ (Không bảo lãnh ngân hàng)")
    doc.add_paragraph("Thời hạn nợ: 45 ngày")
    doc.add_paragraph("Kỹ thuật: 1 thợ, diện tích xưởng 15m²")

    doc.save(path)
    print("Created:", path)


if __name__ == "__main__":
    create_sample_1_pdf()
    create_sample_2_docx()
    create_sample_3_pdf()
    create_sample_4_docx()
    print("All 4 sample test files created successfully in data/sample_files/")

