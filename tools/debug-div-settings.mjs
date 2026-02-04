import fs from "node:fs";

const filePath = process.argv[2] ?? "script.js";
const text = fs.readFileSync(filePath, "utf8");
const lines = text.split(/\r?\n/);

const start = lines.findIndex((l) => l.includes("adminTab === 'settings' && ("));
const end = lines.findIndex((l, i) => i > start && l.includes("8. VISTA POLÍTICA"));

if (start === -1) {
  console.error("Start marker not found.");
  process.exit(1);
}
if (end === -1) {
  console.error("End marker not found.");
  process.exit(1);
}

const stack = [];
const extraCloses = [];

for (let i = start; i < end; i++) {
  const line = lines[i];

  const openMatches = line.match(/<div(\s|>)/g) ?? [];
  const closeMatches = line.match(/<\/div>/g) ?? [];

  for (let k = 0; k < openMatches.length; k++) stack.push(i + 1);
  for (let k = 0; k < closeMatches.length; k++) {
    if (stack.length) stack.pop();
    else extraCloses.push(i + 1);
  }
}

console.log({
  filePath,
  startLine: start + 1,
  endLine: end + 1,
  opensRemaining: stack.length,
  extraCloses: extraCloses.length,
  extraCloseLines: extraCloses.slice(0, 20),
  lastOpenLines: stack.slice(-20),
});
