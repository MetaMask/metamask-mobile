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
  --feature perps|social   Required
  --lang de                Also show this shipped translation
  --match <text>           Only files whose path contains this text
  --format json            Print one JSON object instead of the text list
  --root <path>            Repo root

Reads source and locale JSON. Does not edit either.
Template-string keys (strings(\`perps.\${name}\`)) are not detected.
Plural siblings of a called key are listed with it. Placeholders are listed so a linguist can keep them.
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
  if (args.format && args.format !== 'json') {
    throw new Error('--format only supports json.');
  }
  const lang = args.lang ? lib.resolveLanguage(args.lang) : null;
  if (args.lang && !lang) {
    throw new Error(
      `Unknown language "${args.lang}". Use one of: ${lib.languageList()}.`,
    );
  }
  if (lang === 'en') {
    throw new Error('English is already included. Pass another --lang, or omit it.');
  }
  const enFlat = lib.flattenFile(path.join(lib.translationDir(root), 'en.json'));
  const targetFlat = lang
    ? lib.flattenFile(
        path.join(lib.translationDir(root), lib.SHIPPED[lang].file),
      )
    : null;
  const match = args.match ? String(args.match).toLowerCase() : '';
  const groups = new Map();

  dirs.forEach((relDir) => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) return;
    walk(abs, root, match, groups);
  });

  const screens = [...groups.keys()].sort().map((name) => {
    const files = groups.get(name);
    return {
      screen: name,
      files: [...files.keys()].sort().map((file) => ({
        file,
        keys: [...files.get(file)].sort().map((key) =>
          describeKey(key, enFlat, targetFlat, lang),
        ),
      })),
    };
  });
  const keyCount = screens.reduce(
    (sum, screen) =>
      sum + screen.files.reduce((inner, file) => inner + file.keys.length, 0),
    0,
  );

  if (args.format === 'json') {
    console.log(
      JSON.stringify(
        {
          feature,
          language: lang,
          rtl: false,
          screens: screens.length,
          stringCalls: keyCount,
          groups: screens,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`String keys for ${feature}`);
  if (lang) console.log(`Translation: ${lang} (${lib.SHIPPED[lang].label})`);
  console.log(lib.RTL_NOTE);
  console.log(
    'Give a linguist the key, the placeholders, and both sentences. Do not paste a fix into locales/languages. Crowdin owns those files. A blank feedback form is in tools/designer-language-toggle/FEEDBACK.md.',
  );
  console.log('');

  screens.forEach((screen) => {
    console.log(`## ${screen.screen}`);
    screen.files.forEach((file) => {
      console.log(`  ${file.file}`);
      file.keys.forEach((row) => printKey(row, lang));
    });
    console.log('');
  });

  console.log(`SUMMARY ${feature} screens=${screens.length} string_calls=${keyCount}`);
}

function describeKey(key, enFlat, targetFlat, lang) {
  const enValue = enFlat[key];
  const targetValue = targetFlat ? targetFlat[key] : undefined;
  const placeholders = typeof enValue === 'string'
    ? Object.keys(lib.placeholderCounts(enValue))
    : [];
  const plural = lib.pluralSiblings(key, enFlat).map((sibling) => ({
    key: sibling,
    en: enFlat[sibling],
    translation:
      targetFlat && typeof targetFlat[sibling] === 'string'
        ? targetFlat[sibling]
        : null,
  }));
  return {
    key,
    en: typeof enValue === 'string' ? enValue : null,
    translation: typeof targetValue === 'string' ? targetValue : null,
    language: lang,
    placeholders,
    plural,
  };
}

function printKey(row, lang) {
  const enText = row.en === null ? '(not in en.json)' : lib.quote(row.en);
  console.log(`    ${row.key}  en ${enText}`);
  if (lang) {
    const translated =
      row.translation === null ? '(missing)' : lib.quote(row.translation);
    console.log(`      ${lang} ${translated}`);
  }
  console.log(
    `      placeholders: ${row.placeholders.length ? row.placeholders.map((name) => `{{${name}}}`).join(', ') : 'none'}`,
  );
  row.plural.forEach((sibling) => {
    const enText = lib.quote(sibling.en);
    const extra = lang
      ? `  ${lang} ${sibling.translation === null ? '(missing)' : lib.quote(sibling.translation)}`
      : '';
    console.log(`      plural ${sibling.key}  en ${enText}${extra}`);
  });
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
