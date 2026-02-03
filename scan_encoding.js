
import fs from 'fs';

const content = fs.readFileSync('script.js', 'utf8');
const lines = content.split('\n');
const suspicious = ['Ã', 'Â', 'Å', 'ï¿½'];
let output = '';

lines.forEach((line, index) => {
    let found = false;
    for (const char of suspicious) {
        if (line.includes(char)) {
            found = true;
            break;
        }
    }
    if (line.includes('\uFFFD')) {
        found = true;
    }

    if (found) {
        output += `Line ${index + 1}: ${line.trim()}\n`;
    }
});

fs.writeFileSync('scan_results.txt', output);
