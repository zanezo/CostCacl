const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const root = path.join(__dirname, '..');
const editorConfigPath = path.join(root, '.editorconfig');
const vscodeSettingsPath = path.join(root, '.vscode', 'settings.json');
const checkerPath = path.join(root, 'scripts', 'check-encoding.js');

assert.ok(fs.existsSync(editorConfigPath), 'repo should define a root .editorconfig for UTF-8 defaults');
assert.ok(fs.existsSync(vscodeSettingsPath), 'repo should pin VS Code to UTF-8 settings');
assert.ok(fs.existsSync(checkerPath), 'repo should include a dedicated encoding guard script');

const editorConfig = fs.readFileSync(editorConfigPath, 'utf8');
assert.match(editorConfig, /charset\s*=\s*utf-8/i, '.editorconfig should enforce utf-8');

const vscodeSettingsRaw = fs.readFileSync(vscodeSettingsPath, 'utf8').replace(/^\uFEFF/, '');
const vscodeSettings = JSON.parse(vscodeSettingsRaw);
assert.equal(vscodeSettings['files.encoding'], 'utf8', 'VS Code workspace should default to utf8');
assert.equal(vscodeSettings['files.autoGuessEncoding'], false, 'VS Code workspace should disable guessing encodings');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'costcacl-encoding-guard-'));
const goodFile = path.join(tmpDir, 'good.html');
const badFile = path.join(tmpDir, 'bad.html');
fs.writeFileSync(goodFile, '<title>车辆成本计算器</title>\n<p>打车参考：¥36,875 / 年</p>\n', 'utf8');
fs.writeFileSync(badFile, '<title>杞﹁締鎴愭湰璁＄畻鍣?/title>\n<p>妤?36,875</p>\n', 'utf8');

const goodResult = cp.spawnSync(process.execPath, [checkerPath, goodFile], { encoding: 'utf8' });
assert.equal(goodResult.status, 0, 'encoding guard should pass a clean UTF-8 sample');

const badResult = cp.spawnSync(process.execPath, [checkerPath, badFile], { encoding: 'utf8' });
assert.equal(badResult.status, 1, 'encoding guard should fail a mojibake sample');
assert.match((badResult.stdout || '') + (badResult.stderr || ''), /bad\.html/, 'encoding guard should report the bad file path');
assert.match((badResult.stdout || '') + (badResult.stderr || ''), /妤\?|杞﹁|鎴愭湰|mojibake|乱码/i, 'encoding guard should explain why the file looks broken');

console.log('encoding guard contract passed');
