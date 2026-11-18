"""
Automated Test Suite for Render Integrity & Zero Text Leakage.
Checks that no raw HTML attributes or duplicate brand names leak into visible text.
"""
import os
import sys
import re
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from run_crm import create_app

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.ignore_tags = {'script', 'style', 'svg', 'noscript'}
        self.current_ignore = False
        self.ignore_stack = []

    def handle_starttag(self, tag, attrs):
        if tag in self.ignore_tags:
            self.ignore_stack.append(tag)
            self.current_ignore = True

    def handle_endtag(self, tag):
        if tag in self.ignore_tags and self.ignore_stack:
            self.ignore_stack.pop()
            if not self.ignore_stack:
                self.current_ignore = False

    def handle_data(self, data):
        if not self.current_ignore:
            cleaned = data.strip()
            if cleaned:
                self.text_parts.append(cleaned)


def test_routes():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    routes_to_test = [
        ("/", "Màn 1: Chào mừng"),
        ("/trang-chu", "Màn 2: Quản lý bán hàng"),
        ("/phan-tich/buoc-1", "Màn 3: Bước 1 Kết nối"),
        ("/phan-tich/buoc-2?unlock_all=1", "Màn 3: Bước 2 Làm sạch"),
        ("/phan-tich/buoc-3?unlock_all=1", "Màn 3: Bước 3 Phân tích"),
        ("/phan-tich/buoc-4?unlock_all=1", "Màn 3: Bước 4 Báo cáo"),
    ]

    forbidden_patterns = [
        (r'class="', "Raw class attribute leak"),
        (r'>\s*class=', "Unclosed tag leading to class leak"),
        (r'\bpx-\d', "Raw Tailwind padding class leak"),
        (r'\brounded-\w+', "Raw Tailwind border-radius leak"),
        (r'\bdark:[a-z]', "Raw Tailwind dark variant leak"),
        (r'Soconie\s*Soconie', "Duplicate brand name leak"),
        (r'CRM\s*CRM', "Duplicate CRM badge leak"),
    ]

    print("=" * 65)
    print("RUNNING AUTOMATED RENDER INTEGRITY TESTS...")
    print("=" * 65)

    all_passed = True

    for url, desc in routes_to_test:
        res = client.get(url)
        if res.status_code != 200:
            print(f"[FAIL] {url} returned HTTP {res.status_code}")
            all_passed = False
            continue

        html = res.data.decode("utf-8")

        # Extract visible text
        extractor = TextExtractor()
        extractor.feed(html)
        visible_text = "\n".join(extractor.text_parts)

        page_errors = []
        for pat, err_label in forbidden_patterns:
            matches = re.findall(pat, visible_text, re.IGNORECASE)
            if matches:
                page_errors.append(f"{err_label} (found {len(matches)} match: {matches[0][:40]})")

        if page_errors:
            print(f"[FAIL] {desc} ({url}):")
            for e in page_errors:
                print(f"       -> {e}")
            all_passed = False
        else:
            print(f"[PASS] {desc} ({url}) -> 100% Clean! No text leaks.")

    print("=" * 65)
    if all_passed:
        print("ALL RENDER INTEGRITY TESTS PASSED! ZERO DEFECTS DETECTED.")
        print("=" * 65)
        return 0
    else:
        print("TESTS FAILED! DEFECTS DETECTED.")
        print("=" * 65)
        return 1


if __name__ == "__main__":
    sys.exit(test_routes())
