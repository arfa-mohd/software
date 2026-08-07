import os
import sys
import subprocess
import py_compile
from html.parser import HTMLParser

def check_python_files(root_dir):
    print("🔍 Checking Python files for syntax errors...")
    py_files_count = 0
    for root, _, files in os.walk(root_dir):
        if ".venv" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                try:
                    py_compile.compile(path, doraise=True)
                    py_files_count += 1
                except py_compile.PyCompileError as e:
                    print(f"❌ Python Syntax Error in {path}: {e}")
                    return False
    print(f"✅ All {py_files_count} Python files passed syntax check.")
    return True

def check_js_files(root_dir):
    print("🔍 Checking JavaScript files with Node.js...")
    js_files = []
    for root, _, files in os.walk(root_dir):
        if "node_modules" in root or ".venv" in root:
            continue
        for file in files:
            if file.endswith(".js"):
                js_files.append(os.path.join(root, file))

    if not js_files:
        print("⚠️ No JS files found.")
        return True

    cmd = ["node", "-c"] + js_files
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ JavaScript Syntax Error:\n{res.stderr}")
        return False
    
    print(f"✅ All {len(js_files)} JavaScript files passed syntax check.")
    return True

def check_html_files(root_dir):
    print("🔍 Checking HTML files for parsing errors...")
    html_count = 0
    class StrictHTMLParser(HTMLParser):
        def error(self, message):
            raise Exception(message)

    for root, _, files in os.walk(root_dir):
        if "node_modules" in root or ".venv" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                try:
                    parser = StrictHTMLParser()
                    parser.feed(content)
                    html_count += 1
                except Exception as e:
                    print(f"❌ HTML Parsing Error in {path}: {e}")
                    return False
    print(f"✅ All {html_count} HTML files passed syntax check.")
    return True

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("==================================================")
    print("🚀 AuraCare Automated Syntax & Code Health Check")
    print("==================================================")
    ok_py = check_python_files(base_dir)
    ok_js = check_js_files(base_dir)
    ok_html = check_html_files(base_dir)

    if ok_py and ok_js and ok_html:
        print("\n🎉 ALL CHECKS PASSED SUCCESSFULLY! ZERO ERRORS.")
        sys.exit(0)
    else:
        print("\n❌ SYNTAX CHECK FAILED!")
        sys.exit(1)
