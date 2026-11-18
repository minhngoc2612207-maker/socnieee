"""
Soconie CRM - Universal Cloud & Serverless Runtime Loader (Vercel, Render, Railway, Local)
Developed by Lê Minh Ngọc
"""
import os
import sys
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Auto-unpack soconie_crm_full_deploy.zip if crm/templates is missing (handles GitHub web upload flat structures)
crm_dir = os.path.join(BASE_DIR, "crm")
templates_dir = os.path.join(crm_dir, "templates")

if not os.path.exists(templates_dir):
    unpack_dir = "/tmp/crm_app"
    zip_candidates = [
        os.path.join(BASE_DIR, "soconie_crm_full_deploy.zip"),
        os.path.join(BASE_DIR, "bundle.zip"),
        os.path.join(os.path.dirname(BASE_DIR), "soconie_crm_full_deploy.zip")
    ]
    for zpath in zip_candidates:
        if os.path.exists(zpath):
            try:
                os.makedirs(unpack_dir, exist_ok=True)
                with zipfile.ZipFile(zpath, "r") as z:
                    z.extractall(unpack_dir)
                if unpack_dir not in sys.path:
                    sys.path.insert(0, unpack_dir)
                BASE_DIR = unpack_dir
                break
            except Exception as e:
                print(f"[Loader] Zip unpack note: {e}")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ["VERCEL"] = "1"

try:
    from crm.database import init_db
    from crm.seed import seed_crm_data
    init_db()
    seed_crm_data()
except Exception as _e:
    print(f"[Loader DB note]: {_e}")

from run_crm import create_app

app = create_app()
handler = app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
