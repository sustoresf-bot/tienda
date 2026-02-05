import fs from 'node:fs';

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function scanDivBalanceInRange(lines, startLine, endLine) {
  const segmentLines = lines.slice(startLine - 1, endLine);
  const segment = segmentLines.join('\n');

  let i = 0;
  let line = startLine;
  let col = 0;
  const stack = [];
  const extraCloses = [];

  function readTagEnd(pos) {
    let j = pos;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let braceDepth = 0;

    while (j < segment.length) {
      const ch = segment[j];

      if (inSingle) {
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === "'") inSingle = false;
        j += 1;
        continue;
      }

      if (inDouble) {
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '"') inDouble = false;
        j += 1;
        continue;
      }

      if (inTemplate) {
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '`') inTemplate = false;
        j += 1;
        continue;
      }

      if (ch === "'") {
        inSingle = true;
        j += 1;
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        j += 1;
        continue;
      }
      if (ch === '`') {
        inTemplate = true;
        j += 1;
        continue;
      }

      if (ch === '{') {
        braceDepth += 1;
        j += 1;
        continue;
      }

      if (ch === '}' && braceDepth > 0) {
        braceDepth -= 1;
        j += 1;
        continue;
      }

      if (ch === '>' && braceDepth === 0) return j;
      j += 1;
    }

    return -1;
  }

  function advanceTo(next) {
    for (; i < next && i < segment.length; i += 1) {
      const ch = segment[i];
      if (ch === '\n') {
        line += 1;
        col = 0;
      } else {
        col += 1;
      }
    }
  }

  while (i < segment.length) {
    const ch = segment[i];

    if (ch === '\n') {
      line += 1;
      col = 0;
      i += 1;
      continue;
    }

    if (ch !== '<') {
      col += 1;
      i += 1;
      continue;
    }

    if (segment.startsWith('</div', i)) {
      const gt = segment.indexOf('>', i + 5);
      if (gt !== -1) {
        if (stack.length) stack.pop();
        else extraCloses.push({ line, col });
        advanceTo(gt + 1);
        continue;
      }
    }

    if (segment.startsWith('<div', i)) {
      const gt = readTagEnd(i + 4);
      if (gt !== -1) {
        const tagText = segment.slice(i, gt);
        let k = tagText.length - 1;
        while (k >= 0 && isWhitespace(tagText[k])) k -= 1;
        const selfClosing = k >= 0 && tagText[k] === '/';
        if (!selfClosing) stack.push({ line, col });
        advanceTo(gt + 1);
        continue;
      }
    }

    col += 1;
    i += 1;
  }

  return { stack, extraCloses };
}

const filePath = process.argv[2] || 'script.js';
const startLine = Number(process.argv[3] || 5497);
const endLine = Number(process.argv[4] || 11186);

const lines = readLines(filePath);
const { stack, extraCloses } = scanDivBalanceInRange(lines, startLine, endLine);

console.log(JSON.stringify({ unclosedDivCount: stack.length, extraCloseCount: extraCloses.length, last: stack.slice(-10), extraCloseLast: extraCloses.slice(-10) }, null, 2));
