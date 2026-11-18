"""
Test SMS OTP script for Soconie CRM (Owner: Lê Minh Ngọc - Hotline: 0363651407).
Reads .env configuration and sends 1 real OTP to 0363651407.
"""
import os
import sys

# Ensure root in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from crm.site_config import OWNER_PHONE, OWNER_NAME, SMS_PROVIDER, OTP_DEV_ECHO
from crm.sms.otp_service import normalize_vietnam_phone, format_vietnam_phone_display, request_otp, verify_otp


def main():
    print("=" * 60)
    print(f" SOCONIE CRM - TEST SMS OTP SENDER")
    print(f" Chủ sở hữu: {OWNER_NAME}")
    print(f" Cấu hình SMS Provider: {SMS_PROVIDER}")
    print(f" OTP Dev Echo: {OTP_DEV_ECHO}")
    print("=" * 60)

    target_phone = OWNER_PHONE  # "0363651407"
    normalized = normalize_vietnam_phone(target_phone)
    display = format_vietnam_phone_display(normalized)

    print(f"\n1. Kiểm tra chuẩn hóa số điện thoại:")
    print(f"   - Đầu vào: {target_phone}")
    print(f"   - Chuẩn E.164: {normalized}")
    print(f"   - Hiển thị đẹp: {display}")

    print(f"\n2. Thực hiện gửi mã OTP xác thực:")
    res = request_otp(normalized, purpose="LOGIN", ip_address="127.0.0.1")
    print(f"   - Kết quả gửi: {res.get('success')}")
    print(f"   - Thông báo: {res.get('message')}")
    if res.get("dev_code"):
        print(f"   - [MÃ TEST NỘI BỘ]: {res.get('dev_code')}")

    if res.get("success") and res.get("dev_code"):
        test_code = res.get("dev_code")
        print(f"\n3. Kiểm tra tự động xác minh mã OTP:")
        v_res = verify_otp(normalized, test_code, purpose="LOGIN")
        print(f"   - Kết quả xác minh: {v_res.get('success')}")
        print(f"   - Phản hồi: {v_res.get('message')}")

    print("\n" + "=" * 60)
    print(" HOÀN TẤT KIỂM THỬ SMS OTP!")
    print("=" * 60)


if __name__ == "__main__":
    main()
