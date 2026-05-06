const fs = require('fs');

const buf = fs.readFileSync('js/admin.js.bak');
const text = buf.toString('utf8');

// Fix emoji corruption patterns (UTF-8 emoji read as CP1252/latin1)
// Using hex escapes to avoid encoding issues
const patterns = [
  ['\xf0\x9f\x94\x8d', '📍'],
  ['\xf0\x9f\x94\xa7', '🔧'],
  ['\xf0\x9f\x91\xa4', '👤'],
  ['\xf0\x9f\x94\x92', '🔒'],
  ['\xf0\x9f\x94\xac', '🔬'],
];

// Fix CP1252->UTF-8 mojibake
const latinFixes = [
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Â·', '·'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã\x27', 'Ñ'],
];

let fixed = text;
patterns.forEach(([pattern, replacement]) => {
  fixed = fixed.split(pattern).join(replacement);
});
latinFixes.forEach(([pattern, replacement]) => {
  fixed = fixed.split(pattern).join(replacement);
});

fs.writeFileSync('js/admin.js', fixed, 'utf8');
console.log('Fixed and saved');