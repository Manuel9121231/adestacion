import os
import re

def fix_mojibake(text):
    """
    Attempts to fix mojibake by repeatedly re-encoding as cp1252 and decoding as utf-8.
    """
    current = text
    while True:
        try:
            # Try to 'undo' one level of encoding mismatch
            # We use windows-1252 (cp1252) because it's the most common source of 
            # characters like '€' or '—' being misinterpreted in Windows environments.
            candidate = current.encode('cp1252').decode('utf-8')
            if candidate == current:
                break
            # If the candidate has FEWER non-ascii characters than current, it's likely a fix.
            # Or if it just succeeds, we take it as a potential improvement.
            current = candidate
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
    return current

def process_file(filepath):
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print(f"  Error: Could not read {filepath} as UTF-8. Trying Latin-1...")
        with open(filepath, 'r', encoding='latin-1') as f:
            content = f.read()
    
    fixed_content = fix_mojibake(content)
    
    if fixed_content != content:
        print(f"  Fixed mojibake in {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
    else:
        print(f"  No mojibake found in {filepath}")

files_to_fix = [
    'js/admin.js',
    'js/checklist.js',
    'js/dashboard-ui.js',
    'app.js',
    'registro.html',
    'dashboard.html',
    'index.html'
]

# Get absolute paths
workspace_root = r'c:\Users\holamundo\Documents\GitHub\adestacion'
for rel_path in files_to_fix:
    abs_path = os.path.join(workspace_root, rel_path.replace('/', os.sep))
    if os.path.exists(abs_path):
        process_file(abs_path)
    else:
        print(f"File not found: {abs_path}")
