#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.md', '.svg', '.txt', '.yml', '.yaml']);
const ignoreDirs = new Set(['.git', 'node_modules', '.agents']);
const suspiciousTokens = [
  '锟�',
  '���',
  '妤?',
  '閸',
  '杞﹁',
  '鎴愭湰',
  '璁＄畻',
  '馃',
  '�'
];

function shouldCheck(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    if (shouldCheck(fullPath)) out.push(fullPath);
  }
}

function collectTargets(argv) {
  if (argv.length) {
    return argv
      .map(target => path.resolve(process.cwd(), target))
      .filter(target => fs.existsSync(target) && fs.statSync(target).isFile() && shouldCheck(target));
  }
  const files = [];
  walk(repoRoot, files);
  return files;
}

function findIssue(content) {
  for (const token of suspiciousTokens) {
    if (token === '�') {
      if (content.includes('�') || content.includes('�')) return 'replacement character';
      continue;
    }
    if (content.includes(token)) return token;
  }
  return null;
}

const targets = collectTargets(process.argv.slice(2));
const issues = [];
for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8');
  const issue = findIssue(content);
  if (issue) issues.push({ file, issue });
}

if (issues.length) {
  console.error('Possible mojibake / 乱码 detected:');
  for (const { file, issue } of issues) {
    console.error('- ' + path.relative(process.cwd(), file) + ' -> ' + issue);
  }
  process.exit(1);
}

console.log('encoding guard passed (' + targets.length + ' file' + (targets.length === 1 ? '' : 's') + ')');
