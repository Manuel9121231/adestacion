const fs = require('fs');

const buf = fs.readFileSync('js/admin.js.bak');
const text = buf.toString('utf8');

// Fix emoji corruption patterns (UTF-8 emoji read as CP1252/latin1)
const patterns = [
  [/ðŸ"¢/g, '📍'],
  [/ðŸ"§/g, '🔧'],
  [/ðŸ'·/g, '👤'],
  [/ðŸ"Œ/g, '🔬'],
  [/ðŸ"/g, '🔏'],
  [/ðŸ¦/g, '🖼️'],
];

// Fix CP1252->UTF-8 mojibake
const latinFixes = [
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã±/g, 'ñ'],
  [/Â·/g, '·'],
  [/Ã/g, 'Á'],
  [/Ã‰/g, 'É'],
  [/Ã/g, 'Í'],
  [/Ã“/g, 'Ó'],
  [/Ãš/g, 'Ú'],
  [/Ã'/g, 'Ñ'],
];

let fixed = text;
patterns.forEach(([pattern, replacement]) => {
  fixed = fixed.replace(pattern, replacement);
});
latinFixes.forEach(([pattern, replacement]) => {
  fixed = fixed.replace(pattern, replacement);
});

fs.writeFileSync('js/admin.js', fixed, 'utf8');
console.log('Fixed and saved');