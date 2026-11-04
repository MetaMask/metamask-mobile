#!/usr/bin/env node
/**
 * List strings() keys used by Perps or Social screens, with the English copy.
 * Hand this list to a linguist with the screenshot.
 *
 * node tools/designer-language-toggle/scripts/screenshot-keys.js --feature perps
 */
const fs = require('fs');
const path = require('path');
const lib = require('./locale-lib');

const HELP = `
List string keys for screenshots.

Usage
  node tools/designer-language-toggle/scripts/screenshot-keys.js --feature perps
  node tools/designer-language-toggle/scripts/screenshot-keys.js --feature social --match CopyTrade

Options
  --feature perps|social   Required in v0
  --match <text>           Only files whose path contains this text
  --root <path>            Repo root

Reads source and locales/languages/en.json. Does not edit either.
Template-string keys (strings(\`perps.\${name}\`)) are not detected.
`;

const CALL_RE = /strings\(\s*(['"])([A-Za-z0-9_.]+)\1/g;

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help || !args.feature) {
    console.log(HELP.trim());
    if (!args.feature && !args.help) process.exitCode = 1;
    return;
  }
  const feature = String(args.feature).toLowerCase();
  const dirs = lib.FEATURE_DIRS[feature];
  if (!dirs) {
    throw new Error('--feature must be perps or social.');
  }
  const root = lib.findRepoRoot(args.root);
  const enFlat = lib.flattenFile(path.join(lib.translationDir(root), 'en.json'));
  const match = args.match ? String(args.match).toLowerCase() : '';
  const groups = new Map();

  dirs.forEach((relDir) => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) return;
    walk(abs, root, match, groups);
  });

  console.log(`String keys for ${feature}`);
  console.log(lib.RTL_NOTE);
  console.log(
    'Give a linguist the key plus the English sentence. Do not paste a fix into locales/languages. Crowdin owns those files. A blank feedback form is in tools/designer-language-toggle/FEEDBACK.md.',
  );
  console.log('');

  const names = [...groups.keys()].sort();
  let keyCount = 0;
  names.forEach((name) => {
    const files = groups.get(name);
    console.log(`## ${name}`);
    [...files.keys()].sort().forEach((file) => {
      const keys = [...files.get(file)].sort();
      keyCount += keys.length;
      console.log(`  ${file}`);
      keys.forEach((key) => {
        const enValue = enFlat[key];
        const rendered =
          typeof enValue === 'string' ? lib.quote(enValue) : '(not in en.json)';
        console.log(`    ${key}  ${rendered}`);
      });
    });
    console.log('');
  });

  console.log(`SUMMARY ${feature} screens=${names.length} string_calls=${keyCount}`);
}

function walk(dir, root, match, groups) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__mocks__') return;
      walk(abs, root, match, groups);
      return;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return;
    if (/\.test\./.test(entry.name)) return;
    const rel = path.relative(root, abs);
    if (match && !rel.toLowerCase().includes(match)) return;
    const text = fs.readFileSync(abs, 'utf8');
    const keys = new Set();
    CALL_RE.lastIndex = 0;
    let found = CALL_RE.exec(text);
    while (found) {
      keys.add(found[2]);
      found = CALL_RE.exec(text);
    }
    CALL_RE.lastIndex = 0;
    if (keys.size === 0) return;
    const screen = screenName(rel);
    if (!groups.has(screen)) groups.set(screen, new Map());
    groups.get(screen).set(rel, keys);
  });
}

function screenName(relPath) {
  const parts = relPath.split(path.sep);
  const views = parts.indexOf('Views');
  if (views >= 0 && parts[views + 1]) return parts[views + 1];
  const components = parts.indexOf('components');
  if (components >= 0 && parts[components + 1]) return parts[components + 1];
  return parts[parts.length - 1];
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
