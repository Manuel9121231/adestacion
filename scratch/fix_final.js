const fs = require('fs');
let c = fs.readFileSync('js/admin.js', 'utf8');

// The file contains corrupted emoji patterns
// These are the exact patterns found in the file
const patterns = [
  ['ðŸ"¢', '📍'],  // Location emoji
  ['ðŸ"§', '🔧'],  // Wrench emoji  
  ['ðŸ"‚', '📎'],  // Paperclip
  ['ðŸ"¿', '🔥'],  // Fire
  ['ðŸ"¡', '🔡'],  // ABCD
  ['ðŸ"¥', '🔥'],  // Fire
  ['ðŸ"¬', '🔫'],  // Gun
  ['ðŸ"Œ', '🔬'],  // Microscope
  ['ðŸ"', '🔏'],  // Lock with pen
  ['ðŸ¦', '🖼️'], // Frame with picture
  ['ðŸ\'·', '👤'], // Bust in silhouette
  ['ðŸ"¢', '📍'],  // Location emoji (second variation)
];

let fixedCount = 0;
patterns.forEach(([bad, good]) => {
  const before = c;
  c = c.split(bad).join(good);
  if (c !== before) fixedCount++;
});

fs.writeFileSync('js/admin.js', c, 'utf8');
console.log('Fixed ' + fixedCount + ' patterns');