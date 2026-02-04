import fs from 'node:fs';

const filePath = new URL('../script.js', import.meta.url);
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

let inMain = false;
const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (!inMain) {
    if (line.includes('<main')) inMain = true;
    continue;
  }

  if (line.includes('</main>')) break;

  const openMatches = line.match(/<div(\s|>)/g) ?? [];
  const closeMatches = line.match(/<\/div>/g) ?? [];

  for (let k = 0; k < openMatches.length; k++) stack.push(i + 1);
  for (let k = 0; k < closeMatches.length; k++) {
    if (stack.length) stack.pop();
  }
}

console.log(`Unclosed <div> inside <main>: ${stack.length}`);
console.log(stack.slice(-50).join(', '));
