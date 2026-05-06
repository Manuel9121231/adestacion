const fs = require('fs');

const path = 'js/admin.js';
let content = fs.readFileSync(path, 'utf8');

// Fix common CP1252->UTF-8 mojibake patterns
const fixes = {
  'Ã¡': 'á',
  'Ã©': 'é', 
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã': 'Á',
  'Ã‰': 'É',
  'Ã': 'Í',
  'Ã“': 'Ó',
  'Ãš': 'Ú',
  'Ã‘': 'Ñ',
  'Ã¼': 'ü',
  'Ã¤': 'ä',
  'Ã¶': 'ö',
  'Â·': '·',
  'Â¡': '¡',
  'Â¿': '¿',
  'ÃÂ¡': 'á',
  'ÃÂ©': 'é',
  'âˆ‚': '∂',
  'âˆ„': '∏',
  'âˆ†': '∆',
  'âˆ˜': '˜',
};

for (const [bad, good] of Object.entries(fixes)) {
  content = content.split(bad).join(good);
}

// Fix emoji patterns like ðŸ", ðŸ"§, etc.
content = content.replace(/ðŸ"/g, '📍');
content = content.replace(/ðŸ"§/g, '🔧');
content = content.replace(/ðŸ"‚/g, '📎');
content = content.replace(/ðŸ"¿/g, '🔥');
content = content.replace(/ðŸ"¡/g, '🔡');
content = content.replace(/ðŸ"¥/g, '🔥');
content = content.replace(/ðŸ"¬/g, '🔫');
content = content.replace(/ðŸ"/g, '🔧');
content = content.replace(/ðŸ"Œ/g, '🔬');
content = content.replace(/ðŸ"/g, '🔏');
content = content.replace(/ðŸ¦/g, '🖼️');
content = content.replace(/ðŸ'·/g, '👤');
content = content.replace(/ðŸ"/g, '📍');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed!');