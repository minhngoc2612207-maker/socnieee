import os
import re

base_dir = r"d:\Minh Ngọc BI"
exclude_dirs = {".git", ".gemini", "__pycache__", "venv", ".venv"}

patterns = {
    "double_class": re.compile(r'class="[^"]*"\s+class="'),
    "raw_class_in_text": re.compile(r'>\s*class="'),
    "duplicate_brand": re.compile(r'Soconie\s*Soconie', re.IGNORECASE),
    "shadow_xs": re.compile(r'\bshadow-xs\b'),
}

findings = []

for root, dirs, files in os.walk(base_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for f in files:
        if f.endswith((".html", ".py", ".js", ".json")) and f != "scan_codebase.py":
            fpath = os.path.join(root, f)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                for name, pat in patterns.items():
                    for match in pat.finditer(content):
                        # Calculate line number
                        line_num = content[:match.start()].count("\n") + 1
                        snippet = match.group(0)
                        findings.append((name, fpath, line_num, snippet))
            except Exception as e:
                print(f"Error reading {fpath}: {e}")

print(f"Total findings: {len(findings)}")
for name, fpath, line_num, snippet in findings:
    rel = os.path.relpath(fpath, base_dir)
    print(f"[{name}] {rel}:{line_num} -> {snippet}")
