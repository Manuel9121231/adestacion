import re

with open('js/admin.js.bak', 'rb') as f:
    raw = f.read()

# The bytes c3 b0 c5 b8 e2 80 9c c2 8d represent the corrupted emoji 📍
# f0 9f 94 8d is the correct UTF-8 for 📍

# Replace the corrupted byte sequences with correct ones
replacements = [
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\x8d', '📍'.encode('utf-8')),  # location pin
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\xa7', '🔧'.encode('utf-8')),   # wrench
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x93\xc2\xa4', '👤'.encode('utf-8')),   # bust
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\xac', '🔬'.encode('utf-8')),   # microscope
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\x92', '🔒'.encode('utf-8')),   # lock
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9b\xc2\xbc', '🖼️'.encode('utf-8')),  # frame
]

result = raw
for old, new in replacements:
    count = result.count(old)
    if count > 0:
        result = result.replace(old, new)
        print(f"Replaced {count} instances")

# Also fix the CP1252->UTF-8 mojibake (like Ã¡ -> á)
text_result = result.decode('utf-8')
mojibake_fixes = {
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Â·': '·',
    'Ã': 'Á',
    'Ã‰': 'É',
    'Ã': 'Í',
    'Ã“': 'Ó',
    'Ãš': 'Ú',
}

for bad, good in mojibake_fixes.items():
    text_result = text_result.replace(bad, good)

with open('js/admin.js', 'w', encoding='utf-8') as f:
    f.write(text_result)

print('Done')