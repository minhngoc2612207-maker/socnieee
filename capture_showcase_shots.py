import subprocess
import time
import os

shots = [
    ("shot_screen1_desktop.png", 1280, 800, "http://localhost:5000/"),
    ("shot_screen1_mobile.png", 412, 915, "http://localhost:5000/"),
    ("shot_screen2_desktop.png", 1280, 800, "http://localhost:5000/trang-chu"),
    ("shot_screen2_mobile.png", 412, 915, "http://localhost:5000/trang-chu"),
    ("shot_screen3_step1_desktop_light.png", 1280, 850, "http://localhost:5000/phan-tich/buoc-1?theme=light"),
    ("shot_screen3_step1_desktop_dark.png", 1280, 850, "http://localhost:5000/phan-tich/buoc-1?theme=dark"),
    ("shot_screen3_step1_mobile.png", 412, 915, "http://localhost:5000/phan-tich/buoc-1?theme=light"),
    ("shot_screen3_step2_desktop.png", 1280, 1050, "http://localhost:5000/phan-tich/buoc-2?unlock_all=1&theme=light"),
]

brain_dir = r"C:\Users\THC\.gemini\antigravity\brain\985b2eed-7902-4b89-b84c-58315124fe59"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

for fname, w, h, url in shots:
    out_path = os.path.join(brain_dir, fname)
    cmd = [
        chrome_path,
        "--headless=new",
        "--virtual-time-budget=4000",
        f"--window-size={w},{h}",
        f"--screenshot={out_path}",
        url
    ]
    subprocess.run(cmd, capture_output=True)
    if os.path.exists(out_path):
        print(f"Captured {fname} ({os.path.getsize(out_path)} bytes)")
    else:
        print(f"Failed to capture {fname}")
