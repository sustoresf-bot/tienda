import fs from "node:fs";

const args = process.argv.slice(2);
let filePath = "script.js";
let startLine = 1;
let maxLine = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--start-line") {
    startLine = Number(args[i + 1] ?? 1) || 1;
    i++;
    continue;
  }
  if (arg === "--max-line") {
    maxLine = Number(args[i + 1] ?? 0) || null;
    i++;
    continue;
  }
  if (!arg.startsWith("--")) filePath = arg;
}

const rawContent = fs.readFileSync(filePath, "utf8");
const scanLines = rawContent.split(/\r?\n/).slice(Math.max(0, startLine - 1));
const content = scanLines.join("\n");

const stack = [];

let line = startLine;
let col = 0;
let inString = null;
let inComment = null;
let inRegex = false;
let regexEscaped = false;
let regexCharClass = false;
let prevNonWs = "";

const regexAllowedAfter = new Set([
  "",
  "(",
  "[",
  "{",
  "=",
  ":",
  ",",
  "!",
  "?",
  ";",
  "|",
  "&",
  "^",
  "~",
  "<",
  ">",
  "+",
  "-",
  "*",
  "%",
]);

for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const nxt = content[i + 1];
  col++;

  if (maxLine && line > maxLine) break;

  if (inRegex) {
    if (ch === "\n") {
      inRegex = false;
      regexEscaped = false;
      regexCharClass = false;
      line++;
      col = 0;
      prevNonWs = "";
      continue;
    }
    if (regexEscaped) {
      regexEscaped = false;
      continue;
    }
    if (ch === "\\") {
      regexEscaped = true;
      continue;
    }
    if (ch === "[") {
      regexCharClass = true;
      continue;
    }
    if (ch === "]") {
      regexCharClass = false;
      continue;
    }
    if (ch === "/" && !regexCharClass) {
      inRegex = false;
      continue;
    }
    continue;
  }

  if (inComment === "//") {
    if (ch === "\n") {
      inComment = null;
      line++;
      col = 0;
    }
    continue;
  }

  if (inComment === "/*") {
    if (ch === "*" && nxt === "/") {
      inComment = null;
      i++;
      col++;
      continue;
    }
    if (ch === "\n") {
      line++;
      col = 0;
    }
    continue;
  }

  if (inString === "`") {
    if (ch === "`" && content[i - 1] !== "\\") {
      inString = null;
      continue;
    }
    if (ch === "$" && nxt === "{") {
      stack.push({ ch: "{", line, col: col + 1, kind: "template" });
      i++;
      col++;
      inString = null;
      continue;
    }
    if (ch === "\n") {
      line++;
      col = 0;
    }
    continue;
  }

  if (inString) {
    if (ch === inString && content[i - 1] !== "\\") inString = null;
    if (ch === "\n") {
      line++;
      col = 0;
    }
    continue;
  }

  if (ch === "/" && nxt === "/" && content[i - 1] !== "\\") {
    inComment = "//";
    i++;
    col++;
    continue;
  }

  if (ch === "/" && nxt === "*" && content[i - 1] !== "\\") {
    inComment = "/*";
    i++;
    col++;
    continue;
  }

  if (ch === "\"" || ch === "'" || ch === "`") {
    inString = ch;
    continue;
  }

  if (ch === "/" && content[i - 1] !== "<" && nxt !== "/" && nxt !== "*" && regexAllowedAfter.has(prevNonWs)) {
    inRegex = true;
    regexEscaped = false;
    regexCharClass = false;
    continue;
  }

  if (ch === "(" || ch === "{" || ch === "[") {
    stack.push({ ch, line, col });
  } else if (ch === ")" || ch === "}" || ch === "]") {
    const top = stack.pop();
    if (!top) {
      console.error(`Extra closing ${ch} at ${line}:${col}`);
      process.exitCode = 2;
      break;
    }
    const ok =
      (top.ch === "(" && ch === ")") ||
      (top.ch === "{" && ch === "}") ||
      (top.ch === "[" && ch === "]");
    if (!ok) {
      console.error(`Mismatch: ${top.ch} from ${top.line}:${top.col} with ${ch} at ${line}:${col}`);
      console.error(`Stack tail: ${JSON.stringify(stack.slice(-10))}`);
      process.exitCode = 3;
      break;
    }
    if (top.kind === "template") {
      inString = "`";
    }
  }

  if (ch === "\n") {
    line++;
    col = 0;
    prevNonWs = "";
    continue;
  }

  if (!/\s/.test(ch)) prevNonWs = ch;
}

if (!process.exitCode && stack.length) {
  const last = stack.slice(-20);
  for (const item of last) {
    console.error(`Unclosed ${item.ch} from ${item.line}:${item.col}`);
  }
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log("OK: braces/parens balanced (strings/comments ignored).");
}
