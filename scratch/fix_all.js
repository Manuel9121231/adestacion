const fs = require('fs');
const path = require('path');

function fixMojibake(text) {
    let current = text;
    let iterations = 0;
    while (iterations < 5) {
        let next = "";
        let hasChanged = false;
        
        // We convert string to bytes interpreting chars as CP1252
        const bytes = [];
        for (let j = 0; j < current.length; j++) {
            let code = current.charCodeAt(j);
            // Map CP1252 back to bytes
            if (code === 0x20AC) code = 0x80;
            else if (code === 0x201A) code = 0x82;
            else if (code === 0x0192) code = 0x83;
            else if (code === 0x201E) code = 0x84;
            else if (code === 0x2026) code = 0x85;
            else if (code === 0x2020) code = 0x86;
            else if (code === 0x2021) code = 0x87;
            else if (code === 0x02C6) code = 0x88;
            else if (code === 0x2030) code = 0x89;
            else if (code === 0x0160) code = 0x8A;
            else if (code === 0x2039) code = 0x8B;
            else if (code === 0x0152) code = 0x8C;
            else if (code === 0x017D) code = 0x8E;
            else if (code === 0x2018) code = 0x91;
            else if (code === 0x2019) code = 0x92;
            else if (code === 0x201C) code = 0x93;
            else if (code === 0x201D) code = 0x94;
            else if (code === 0x2022) code = 0x95;
            else if (code === 0x2013) code = 0x96;
            else if (code === 0x2014) code = 0x97;
            else if (code === 0x02DC) code = 0x98;
            else if (code === 0x2122) code = 0x99;
            else if (code === 0x0161) code = 0x9A;
            else if (code === 0x203A) code = 0x9B;
            else if (code === 0x0153) code = 0x9C;
            else if (code === 0x017E) code = 0x9E;
            else if (code === 0x0178) code = 0x9F;
            
            if (code <= 255) {
                bytes.push(code);
            } else {
                // If we hit a char that can't be mapped to a byte, 
                // this whole branch might be invalid for this level of mojibake.
                // But let's keep it as is if it's high unicode.
                return current; 
            }
        }
        
        try {
            const buf = Buffer.from(bytes);
            const decoded = buf.toString('utf8');
            
            // Check if decoding was successful (no replacement characters)
            if (decoded.includes('\ufffd')) {
                break;
            }
            
            if (decoded === current) {
                break;
            }
            
            current = decoded;
            iterations++;
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
    'index.html',
    'css/main.css'
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
            console.log(`  No mojibake detected in ${f}`);
        }
    }
});
