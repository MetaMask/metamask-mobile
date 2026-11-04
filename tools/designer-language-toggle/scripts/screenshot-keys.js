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
Plural siblings of a called key are listed with it. Placeholders are included in the character count.
Template keys and *_I18N maps in the scanned files are expanded.
The key list can still miss strings that are built in code, so compare it with the screenshot.
`;

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
  const limits = lib.loadLimits(lib.defaultLimitsPath());
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
    walk(abs, root, match, groups, enFlat);
  });

  const screens = [...groups.keys()].sort().map((name) => {
    const files = groups.get(name);
    return {
      screen: name,
      files: [...files.keys()].sort().map((file) => ({
        file,
        keys: [...files.get(file)].sort().map((key) =>
          describeKey(key, enFlat, targetFlat, lang, limits),
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
    const context = [];
    screens.forEach((screen) => {
      screen.files.forEach((file) => {
        file.keys.forEach((row) => {
          const component = path.basename(file.file).replace(/\.(tsx|ts|jsx|js)$/, '');
          const entries = row.plural.length > 0 && row.en === null ? row.plural : [row];
          entries.forEach((entry) => {
            const source = entry.en || entry.source || '';
            context.push({
              key: entry.key || row.key,
              source,
              feature,
              component,
              description: (limits.keys[entry.key || row.key] || {}).where || '',
              max_length:
                (limits.keys[entry.key || row.key] || {}).maxCharacters ?? null,
              characters: entry.characters ?? (source ? lib.characterCount(source) : null),
              width_hint: source ? lib.displayWidth(source) : null,
              placeholders: source ? Object.keys(lib.placeholderCounts(source)) : row.placeholders,
              translation: entry.translation ?? null,
              translation_characters:
                entry.translation != null ? lib.characterCount(entry.translation) : null,
            });
          });
          if (row.en !== null) {
            row.plural.forEach((sibling) => {
              context.push({
                key: sibling.key,
                source: sibling.en,
                feature,
                component,
                description: '',
                max_length: null,
                characters: sibling.characters,
                width_hint: lib.displayWidth(sibling.en),
                placeholders: Object.keys(lib.placeholderCounts(sibling.en)),
                translation: sibling.translation,
                translation_characters:
                  sibling.translation != null
                    ? lib.characterCount(sibling.translation)
                    : null,
              });
            });
          }
        });
      });
    });
    console.log(JSON.stringify({ feature, language: lang, strings: context }, null, 2));
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

function describeKey(key, enFlat, targetFlat, lang, limits) {
  const direct = typeof enFlat[key] === 'string' ? enFlat[key] : null;
  const pluralForms = direct ? null : lib.pluralFormsFor(enFlat, key);
  const placeholders = direct
    ? Object.keys(lib.placeholderCounts(direct))
    : [];
  const limit = limits && limits.keys[key] ? limits.keys[key].maxCharacters : null;
  const plural = (direct ? lib.pluralSiblings(key, enFlat) : []).map((sibling) => ({
    key: sibling,
    en: enFlat[sibling],
    characters: lib.characterCount(enFlat[sibling]),
    translation:
      targetFlat && typeof targetFlat[sibling] === 'string'
        ? targetFlat[sibling]
        : null,
  }));
  const expanded = pluralForms
    ? Object.keys(pluralForms).map((form) => ({
        key: `${key}.${form}`,
        en: pluralForms[form],
        characters: lib.characterCount(pluralForms[form]),
        translation:
          targetFlat && typeof targetFlat[`${key}.${form}`] === 'string'
            ? targetFlat[`${key}.${form}`]
            : null,
      }))
    : plural;
  return {
    key,
    source: direct,
    en: direct,
    characters: direct ? lib.characterCount(direct) : null,
    widthHint: direct ? lib.displayWidth(direct) : null,
    max_length: limit,
    translation: targetFlat && typeof targetFlat[key] === 'string' ? targetFlat[key] : null,
    translationCharacters:
      targetFlat && typeof targetFlat[key] === 'string'
        ? lib.characterCount(targetFlat[key])
        : null,
    language: lang,
    placeholders,
    plural: expanded,
  };
}

function printKey(row, lang) {
  if (row.en === null && row.plural.length > 0) {
    console.log(`    ${row.key}`);
    row.plural.forEach((sibling) => printPlural(sibling, lang));
    return;
  }
  const enText = row.en === null ? '(not in en.json)' : lib.quote(row.en);
  const count =
    row.characters === null ? '' : `  (${row.characters} characters`;
  const limit = row.max_length === null ? '' : `, limit ${row.max_length}`;
  const close = count ? ')' : '';
  console.log(`    ${row.key}  en ${enText}${count}${limit}${close}`);
  if (lang) {
    const translated =
      row.translation === null ? '(missing)' : lib.quote(row.translation);
    const translatedCount =
      row.translationCharacters === null
        ? ''
        : `  (${row.translationCharacters} characters, width hint ${lib.displayWidth(row.translation)})`;
    console.log(`      ${lang} ${translated}${translatedCount}`);
  }
  console.log(
    `      placeholders: ${row.placeholders.length ? row.placeholders.map((name) => `{{${name}}}`).join(', ') : 'none'}`,
  );
  row.plural.forEach((sibling) => printPlural(sibling, lang));
}

function printPlural(sibling, lang) {
  const extra = lang
    ? `  ${lang} ${sibling.translation === null ? '(missing)' : lib.quote(sibling.translation)}`
    : '';
  console.log(
    `      plural ${sibling.key}  en ${lib.quote(sibling.en)}  (${sibling.characters} characters)${extra}`,
  );
}

function walk(dir, root, match, groups, enFlat) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__mocks__') return;
      walk(abs, root, match, groups, enFlat);
      return;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return;
    if (/\.test\./.test(entry.name)) return;
    const rel = path.relative(root, abs);
    if (match && !rel.toLowerCase().includes(match)) return;
    const text = fs.readFileSync(abs, 'utf8');
    const keys = lib.extractStringKeys(text, enFlat);
    if (keys.size === 0) return;
    const screen = lib.screenName(rel);
    if (!groups.has(screen)) groups.set(screen, new Map());
    groups.get(screen).set(rel, keys);
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
