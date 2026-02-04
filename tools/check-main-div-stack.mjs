import fs from "node:fs";

const args = process.argv.slice(2);
let filePath = "script.js";
let traceFrom = null;
let traceTo = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith("--") && i === 0) {
    filePath = arg;
    continue;
  }
  if (arg === "--trace-from") {
    traceFrom = Number(args[i + 1] ?? 0) || null;
    i++;
    continue;
  }
  if (arg === "--trace-to") {
    traceTo = Number(args[i + 1] ?? 0) || null;
    i++;
    continue;
  }
}

const source = fs.readFileSync(filePath, "utf8");
const lines = source.split(/\r?\n/);

let inMain = false;
const stack = [];
const errors = [];
const traceEnabled = traceFrom != null || traceTo != null;

function countMatches(line, re) {
  const m = line.match(re);
  return m ? m.length : 0;
}

for (let i = 0; i < lines.length; i++) {
  const lineNo = i + 1;
  const line = lines[i];

  if (!inMain) {
    if (line.includes("<main")) inMain = true;
    continue;
  }

  if (line.includes("</main>")) break;

  const opens = countMatches(line, /<div(\s|>|$)/g);
  const closes = countMatches(line, /<\/div>/g);

  for (let k = 0; k < opens; k++) stack.push(lineNo);

  for (let k = 0; k < closes; k++) {
    if (!stack.length) errors.push({ lineNo, kind: "extra_close" });
    else stack.pop();
  }

  const inTrace = (traceFrom == null || lineNo >= traceFrom) && (traceTo == null || lineNo <= traceTo);
  if (traceEnabled && inTrace && (opens || closes)) {
    const delta = opens - closes;
    console.log(`${lineNo}\topens=${opens}\tcloses=${closes}\tdelta=${delta}\tstack=${stack.length}`);
  }
}

if (errors.length) {
  console.log(`Extra </div> inside <main>: ${errors.length}`);
  console.log(errors.slice(0, 50).map((e) => e.lineNo).join(", "));
} else {
  console.log("No extra </div> found inside <main>.");
}

console.log(`Unclosed <div> inside <main>: ${stack.length}`);
console.log(stack.slice(-50).join(", "));
