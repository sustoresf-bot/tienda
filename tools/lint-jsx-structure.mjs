import fs from "node:fs";

const filePath = process.argv[2] ?? "script.js";
const source = fs.readFileSync(filePath, "utf8");

const issues = [];

if (source.includes("</React.Fragment >")) {
  issues.push("Invalid JSX closing tag found: </React.Fragment >");
}

const mainOpen = (source.match(/<main(\s|>)/g) ?? []).length;
const mainClose = (source.match(/<\/main>/g) ?? []).length;
if (mainOpen !== mainClose) {
  issues.push(`JSX mismatch for <main>: open=${mainOpen} close=${mainClose}`);
}

const fragOpen = (source.match(/<React\.Fragment(\s|>)/g) ?? []).length;
const fragClose = (source.match(/<\/React\.Fragment>/g) ?? []).length;
if (fragOpen !== fragClose) {
  issues.push(`JSX mismatch for <React.Fragment>: open=${fragOpen} close=${fragClose}`);
}

if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
} else {
  console.log("OK: JSX structure checks passed.");
}

