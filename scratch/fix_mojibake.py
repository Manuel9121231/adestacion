import os

files = [
    r"c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js",
    r"c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js",
    r"c:\Users\holamundo\Documents\GitHub\adestacion\registro.html",
    r"c:\Users\holamundo\Documents\GitHub\adestacion\css\main.css"
]

def fix_encoding(path):
    if not os.path.exists(path): return
    print(f"Fixing {path}")
    with open(path, 'rb') as f:
        content = f.read()
    
    # The file might have been saved as UTF-8 but the content is Mojibake
    # We try to decode as UTF-8, then encode as latin-1, then decode as UTF-8 again
    try:
        text = content.decode('utf-8')
        # If it looks like Mojibake (many Ã characters)
        if text.count('Ã') > 10:
            # Re-interpret the bytes as latin-1 and then decode as UTF-8
            # This reverses one level of mojibake
            fixed = text.encode('latin-1').decode('utf-8')
            # If it still looks like mojibake, repeat
            if fixed.count('Ã') > 5:
                fixed = fixed.encode('latin-1').decode('utf-8')
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed)
            print(f"Successfully fixed {path}")
    except Exception as e:
        print(f"Could not fix {path}: {e}")

for f in files:
    fix_encoding(f)
