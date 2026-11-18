"""
Soconie CRM - Lê Minh Ngọc Enterprise CRM - Server Entrypoint
Runs on http://localhost:5000
"""
import os
import sys
from datetime import datetime

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, render_template
from crm.config import SECRET_KEY, BRAND_NAME, BRAND_SUBTITLE
from crm.site_config import PRICING_PACKAGES
from crm.database import init_db
from crm.seed import seed_crm_data
from crm.auth import get_current_user

# Import route blueprints
from crm.routes.auth_routes import auth_bp
from crm.routes.dashboard_routes import dashboard_bp
from crm.routes.system_routes import system_bp
from crm.routes.stub_routes import stub_bp
from crm.routes.captcha_routes import captcha_bp
from crm.routes.analysis_routes import analysis_bp


def create_app():
    # Dynamic candidate paths for templates and static (compatible with local & Vercel Serverless)
    candidate_template_dirs = [
        os.path.join(BASE_DIR, "crm", "templates"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "crm", "templates"),
        os.path.join(os.getcwd(), "crm", "templates"),
        os.path.join(BASE_DIR, "templates"),
        os.path.join(os.getcwd(), "templates"),
    ]
    templates_dir = next((p for p in candidate_template_dirs if os.path.isdir(p)), os.path.join(BASE_DIR, "crm", "templates"))

    candidate_static_dirs = [
        os.path.join(BASE_DIR, "crm", "static"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "crm", "static"),
        os.path.join(os.getcwd(), "crm", "static"),
        os.path.join(BASE_DIR, "static"),
        os.path.join(os.getcwd(), "static"),
    ]
    static_dir = next((p for p in candidate_static_dirs if os.path.isdir(p)), os.path.join(BASE_DIR, "crm", "static"))

    app = Flask(
        __name__,
        template_folder=templates_dir,
        static_folder=static_dir,
        static_url_path="/static"
    )

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.jinja_env.auto_reload = True

    # Context processors
    @app.context_processor
    def inject_global_context():
        return {
            "current_user": get_current_user(),
            "brand_name": BRAND_NAME,
            "brand_subtitle": BRAND_SUBTITLE,
            "pricing_packages": PRICING_PACKAGES,
            "now_year": datetime.now().year
        }

    # Custom Jinja filters
    @app.template_filter("currency")
    def format_currency(value):
        try:
            val = float(value or 0)
            return f"{val:,.0f} đ".replace(",", ".")
        except (ValueError, TypeError):
            return "0 đ"

    @app.template_filter("time_ago")
    def time_ago(value):
        if not value:
            return ""
        return str(value)

    # Register Blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(stub_bp)
    app.register_blueprint(captcha_bp)
    app.register_blueprint(analysis_bp)

    # Favicon handler to avoid 404
    @app.route("/favicon.ico")
    def favicon():
        fav_path = os.path.join(static_dir, "images", "favicon.ico")
        if os.path.exists(fav_path):
            return app.send_static_file("images/favicon.ico")
        return ("", 204)

    # Friendly Error Handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template(
            "shared/placeholder_page.html",
            active_page="404",
            page_title="Không Tìm Thấy Trang (404)",
            page_subtitle="Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.",
            page_icon="fa-solid fa-triangle-exclamation",
            roadmap_stage="Hệ thống",
            sample_items=[]
        ), 404

    @app.errorhandler(403)
    def access_denied(e):
        return render_template(
            "shared/placeholder_page.html",
            active_page="403",
            page_title="Truy Cập Bị Từ Chối (403)",
            page_subtitle="Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ Quản trị viên Minh Ngọc.",
            page_icon="fa-solid fa-lock",
            roadmap_stage="Hệ thống",
            sample_items=[]
        ), 403

    @app.errorhandler(500)
    def internal_server_error(e):
        import traceback
        err_detail = traceback.format_exc()
        print(f"[500 Error Captured]:\n{err_detail}")
        try:
            return render_template(
                "shared/placeholder_page.html",
                active_page="500",
                page_title="Đang Tải Dữ Liệu Phiên (500)",
                page_subtitle="Hệ thống đang khởi tạo dịch vụ phiên làm việc. Vui lòng tải lại trang sau giây lát.",
                page_icon="fa-solid fa-rotate",
                roadmap_stage="Hệ thống",
                sample_items=[]
            ), 500
        except Exception:
            return (
                "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Soconie CRM</title></head>"
                "<body style='font-family:system-ui,-apple-system,sans-serif;padding:48px 24px;background:#f8fafc;color:#1e293b;max-width:680px;margin:auto;text-align:center;'>"
                "<div style='font-size:48px;margin-bottom:16px;'>⏳</div>"
                "<h2 style='font-size:24px;font-weight:700;margin-bottom:8px;'>Hệ thống đang khởi tạo dịch vụ</h2>"
                "<p style='color:#64748b;margin-bottom:24px;'>Phiên làm việc đang hoàn tất kết nối. Vui lòng bấm nút bên dưới để tải lại.</p>"
                "<a href='/' style='display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:12px;font-weight:600;text-decoration:none;'>Tải lại trang</a>"
                "</body></html>",
                500
            )

    return app


if __name__ == "__main__":
    print("=" * 60)
    print("Khởi tạo cơ sở dữ liệu Minh Ngọc...")
    init_db()
    seed_crm_data()
    print("Dữ liệu mẫu đã sẵn sàng!")
    print("=" * 60)
    print("Soconie CRM - Lê Minh Ngọc")
    print("Quản trị bán hàng & CRM Doanh nghiệp")
    print("=" * 60)
    print("Đang khởi động máy chủ tại:")
    print(" -> Trang chủ Showcase: http://localhost:5000/")
    print(" -> Tổng quan 3D Kính mờ: http://localhost:5000/tong-quan-3d")
    print(" -> Bảng điều khiển CRM Doanh nghiệp: http://localhost:5000/tong-quan")
    print("=" * 60)

    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=False)
