const fs = require('fs');
const path = require('path');

const map = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
    0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
    0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F
};

function fixString(str) {
    let current = str;
    for (let i = 0; i < 3; i++) {
        const bytes = [];
        for (let j = 0; j < current.length; j++) {
            let code = current.charCodeAt(j);
            if (map[code]) code = map[code];
            if (code <= 255) bytes.push(code);
            else bytes.push(63); // '?'
        }
        const buf = Buffer.from(bytes);
        const decoded = buf.toString('utf8');
        if (decoded.includes('\ufffd') || decoded === current) break;
        current = decoded;
    }
    return current;
}

const content = fs.readFileSync('js/admin.js', 'utf8');
const lines = content.split('\n');
const fixedLines = lines.map(line => {
    if (line.includes('Ã')) {
        return fixString(line);
    }
    return line;
});

const fixedContent = fixedLines.join('\n');
if (fixedContent !== content) {
    fs.writeFileSync('js/admin.js', fixedContent, 'utf8');
    console.log("Fixed js/admin.js");
} else {
    console.log("No changes made to js/admin.js");
}
