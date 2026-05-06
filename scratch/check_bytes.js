const fs = require('fs');
const path = 'js/admin.js';
const buf = fs.readFileSync(path);
console.log(buf.slice(0, 500).toString('hex'));
