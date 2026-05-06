const fs = require('fs');
const path = require('path');

// We need a way to encode/decode windows-1252 in Node.
// Since we don't want to install extra packages, we can use a simple mapping 
// or just trust that for most common mojibake, the byte values match Latin-1 
// except for the 0x80-0x9F range.
// Fortunately, most mojibake characters are in the 0xC0-0xFF range which match.

function fixMojibake(content) {
    let current = content;
    while (true) {
        try {
            // Convert string to bytes using Latin-1 (preserves byte values 0-255)
            const bytes = Buffer.from(current, 'latin1');
            
            // Try to decode those bytes as UTF-8
            // If it contains invalid UTF-8, this might not throw but will produce replacement chars.
            // We want to detect if it's "valid" UTF-8.
            const decoded = bytes.toString('utf8');
            
            // If decoding produced replacement characters or didn't change anything, stop.
            if (decoded === current || decoded.includes('\ufffd')) {
                break;
            }
            
            // Heuristic: if the new string is longer or has more 'weird' chars, it might be wrong.
            // But usually mojibake strings are longer than the original.
            // Let's just check if it's stable.
            current = decoded;
        } catch (e) {
            break;
        }
    }
    return current;
}

const files = [
    'js/admin.js',
    'js/checklist.js',
    'js/dashboard-ui.js',
    'app.js',
    'registro.html',
    'dashboard.html',
    'index.html'
];

const workspaceRoot = 'c:\\Users\\holamundo\\Documents\\GitHub\\adestacion';

files.forEach(f => {
    const filePath = path.join(workspaceRoot, f);
    if (fs.existsSync(filePath)) {
        console.log(`Processing ${f}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        const fixed = fixMojibake(content);
        if (fixed !== content) {
            console.log(`  Fixed mojibake in ${f}`);
            fs.writeFileSync(filePath, fixed, 'utf8');
        } else {
            console.log(`  No mojibake found in ${f}`);
        }
    } else {
        console.log(`File not found: ${f}`);
    }
});
