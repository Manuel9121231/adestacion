import re

with open('js/admin.js.bak', 'rb') as f:
    raw = f.read()

# Find all unique byte sequences that start with c3 b0 c5 b8 (ðŸ)
# followed by different bytes
patterns = []
i = 0
while i < len(raw) - 10:
    if raw[i:i+2] == b'\xc3\xb0' and raw[i+2:i+4] == b'\xc5\xb8':
        # Found start of corrupted sequence
        end = i + 2
        while end < len(raw) and raw[end] >= 0x80:
            end += 1
        seq = raw[i:end]
        patterns.append((seq, raw[i:i+10]))
        i = end
    else:
        i += 1

# Print unique patterns
seen = set()
for seq, context in patterns:
    if seq not in seen:
        seen.add(seq)
        try:
            decoded = seq.decode('latin-1')
        except:
            decoded = '?'
        print(f'Sequence: {seq.hex()} -> {decoded}')