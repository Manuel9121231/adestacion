import re

with open('js/admin.js.bak', 'rb') as f:
    content = f.read()

# The file has UTF-8 bytes that were interpreted as CP1252/latin1 and re-saved
# Let's decode by interpreting as latin1 and encoding as UTF-8

text = content.decode('latin-1')

# Now fix the corrupted sequences
# The patterns like ðŸ"¢ should become 📍

# Map of corrupted sequences to correct emojis
replacements = {
    'ðŸ"¢': '📍',  # location pin
    'ðŸ"§': '🔧',  # wrench
    'ðŸ\'·': '👤',  # bust in silhouette  
    'ðŸ"Œ': '🔬',  # microscope
    'ðŸ"': '🔏',  # locked with pen
    'ðŸ¦': '🖼️',  # frame with picture
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

for bad, good in replacements.items():
    if bad in text:
        text = text.replace(bad, good)

with open('js/admin.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed')