import os

def fix_mojibake(text):
    # Try multiple levels of decoding
    for _ in range(3):
        try:
            # Re-interpret the string as CP1252 bytes and decode as UTF-8
            # This is the standard way to fix mojibake from UTF-8 interpreted as CP1252
            candidate = text.encode('cp1252').decode('utf-8')
            if candidate == text:
                break
            text = candidate
        except (UnicodeEncodeError, UnicodeDecodeError):
            # If we hit an error, it might be that it's partially fixed or not CP1252
            # Try latin-1 as a fallback for the encode step
            try:
                candidate = text.encode('latin-1').decode('utf-8')
                if candidate == text:
                    break
                text = candidate
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
    return text

files = [
    'js/admin.js',
    'js/checklist.js',
    'js/dashboard-ui.js',
    'app.js',
    'registro.html',
    'dashboard.html',
    'index.html',
    'css/main.css'
]

workspace = r'c:\Users\holamundo\Documents\GitHub\adestacion'

for f_rel in files:
    path = os.path.join(workspace, f_rel)
    if not os.path.exists(path):
        print(f"Skipping {f_rel} (not found)")
        continue
    
    print(f"Processing {f_rel}...")
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        fixed = fix_mojibake(content)
        
        if fixed != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed)
            print(f"  Fixed mojibake in {f_rel}")
        else:
            print(f"  No mojibake detected in {f_rel}")
            
    except Exception as e:
        print(f"  Error processing {f_rel}: {e}")

print("Done!")
