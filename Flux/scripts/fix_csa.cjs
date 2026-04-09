const fs = require('fs');
const path = require('path');

const csaPath = path.join(__dirname, '../src/data/csa_exam.json');
const data = JSON.parse(fs.readFileSync(csaPath, 'utf8'));

data.forEach(q => {
  if (typeof q.answer === 'string') {
    if (q.type === 'multiple-choice' && q.options && q.options.length > 0) {
      // Split by comma if the answer string explicitly resembles old extracted format
      // Note: the user manually edited some, so we try to find exact matches first.
      const matches = q.options.filter(opt => q.answer.toLowerCase().includes(opt.toLowerCase().trim()));
      
      if (matches.length > 0) {
        q.answer = matches;
      } else {
        // Just put whatever they had there in an array, maybe multiple ones if comma separated
        q.answer = q.answer.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else {
      q.answer = [q.answer];
    }
  } else if (!Array.isArray(q.answer)) {
     q.answer = [];
  }
});

fs.writeFileSync(csaPath, JSON.stringify(data, null, 2));
console.log('Fixed csa_exam.json answers to be native arrays!');
