#!/usr/bin/env node
/**
 * Compare a shipped locale with English.
 *
 * node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps
 */
const fs = require('fs');
const path = require('path');
const lib = require('./locale-lib');

const HELP = `
Flag translation strings for a designer preview.

Usage
  node tools/designer-language-toggle/scripts/check-strings.js --lang <language> [options]

Options
  --lang de            Language code or name (de, german, ja-JP, pt-BR, …)
  --feature perps      perps, or social (social + social_leaderboard)
  --namespace perps    One or more top-level locale namespaces, comma-separated
  --ratio 1.4          Too-long when width is at least this times English
  --limit 15           How many examples to print per list
  --strict             Also list strings that match English in most languages
  --root <path>        Repo root. Defaults to the current checkout.

The script only reads locale files. It does not edit them.
Regional files such as ja-jp.json are reported separately. The app does not import them.
`;

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP.trim());
    return;
  }
  const code = lib.resolveLanguage(args.lang);
  if (!code) {
    throw new Error(
      `Pass --lang with a shipped language. Use one of: ${lib.languageList()}. Names such as german, japanese, and pt-BR also work.`,
    );
  }
  if (code === 'en') {
    throw new Error(
      'English is the source this check compares against. Pick another language, for example de or ja.',
    );
  }

  const root = lib.findRepoRoot(args.root);
  const namespaces = lib.resolveNamespaces(args);
  const ratio = args.ratio ? Number(args.ratio) : 1.4;
  if (!Number.isFinite(ratio) || ratio <= 1) {
    throw new Error('--ratio must be a number greater than 1, for example 1.4.');
  }
  const limit = args.limit ? Number(args.limit) : 15;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive integer.');
  }

  const meta = lib.SHIPPED[code];
  const enFlat = lib.flattenFile(
    path.join(lib.translationDir(root), 'en.json'),
  );
  const targetPath = path.join(lib.translationDir(root), meta.file);
  const targetFlat = lib.flattenFile(targetPath);
  const sharedFlats = lib.loadShippedFlats(root);
  const report = lib.analyzePair(enFlat, targetFlat, {
    namespaces,
    sharedFlats,
    strict: Boolean(args.strict),
    ratio,
    minDelta: 4,
    minEnWidth: 4,
  });
  const dateValues = lib.scanDateValues(targetFlat, namespaces);
  const dateSource = lib.scanDateSource(root, namespaces);

  const scopeLabel = namespaces ? namespaces.join(', ') : 'all strings';
  console.log(`Language: ${code} (${meta.label})`);
  console.log(`File: locales/languages/${meta.file}`);
  console.log(
    'This is the file locales/i18n.js imports. The Android preview uses this file.',
  );
  console.log(`Scope: ${scopeLabel}`);
  console.log(lib.RTL_NOTE);
  console.log('');
  console.log(`Keys in scope: ${report.inScopeCount}`);
  console.log(`Missing: ${report.missing.length}`);
  console.log(`Still English: ${report.stillEnglish.length}`);
  const shortTooLong = report.tooLong.filter((row) => row.enWidth <= 12);
  console.log(`Too long: ${report.tooLong.length}`);
  console.log(
    `Too long, short English (12 width or less, the button-sized ones): ${shortTooLong.length}`,
  );
  console.log(
    `Skipped as shared names or tokens: ${report.skippedShared.length}`,
  );
  console.log(`Extra keys not in English: ${report.extra}`);
  console.log(
    `Too-long rule: display width >= English x ${ratio}, and at least 4 width units longer, and English is at least 4 wide. Placeholders are ignored. CJK, kana, and hangul count as 2.`,
  );

  printFocus(enFlat, targetFlat, namespaces);
  printList(
    'Missing',
    report.missing.map((row) => `${row.key}  en ${lib.quote(row.en)}`),
    limit,
  );
  printList(
    'Still English',
    report.stillEnglish.map((row) => `${row.key}  ${lib.quote(row.value)}`),
    limit,
  );
  printList(
    'Too long',
    report.tooLong.map(
      (row) =>
        `${row.key}  en ${lib.quote(row.en)} (${row.enChars} chars, width ${row.enWidth})  →  ${lib.quote(row.target)} (${row.targetChars} chars, width ${row.targetWidth}, ${row.ratio.toFixed(2)}x)`,
    ),
    limit,
  );

  console.log('');
  console.log(
    'Date-format hints are best-effort. A hit is a hard-coded date shape or an English locale in code, not a full audit.',
  );
  printList(
    'Date hints in this locale file',
    dateValues.map(
      (row) =>
        `${row.key}  [${row.names.join(', ')}]  ${lib.quote(row.value)}`,
    ),
    limit,
  );
  if (!namespaces) {
    console.log('');
    console.log(
      'Date hints in screen code: skipped. Add --feature perps or --feature social to scan those screens.',
    );
  } else if (dateSource.dirs.length === 0) {
    console.log('');
    console.log(
      'Date hints in screen code: this namespace has no screen folder mapped in v0.',
    );
  } else {
    printList(
      `Date hints in screen code (${dateSource.dirs.join(', ')})`,
      dateSource.hits.map(
        (row) =>
          `${row.file}:${row.line}  [${row.names.join(', ')}]  ${row.text}`,
      ),
      limit,
    );
  }

  printRegional(root, meta, namespaces, enFlat, sharedFlats, {
    strict: Boolean(args.strict),
    ratio,
  });

  if (!args.strict && report.skippedShared.length > 0) {
    console.log('');
    console.log(
      'Strings shorter than 3 characters, strings with no real word once placeholders are removed, and strings that match English in most languages are left out of Still English. Re-run with --strict to include the shared ones.',
    );
  }

  console.log('');
  console.log(
    `SUMMARY ${code} ${scopeLabel} missing=${report.missing.length} still_english=${report.stillEnglish.length} too_long=${report.tooLong.length} too_long_short=${shortTooLong.length} date_hints=${dateValues.length + dateSource.hits.length}`,
  );
  console.log(
    'No locale JSON was edited. Crowdin owns locales/languages. To change the preview language, use apply-locale.js.',
  );
}

function printFocus(enFlat, targetFlat, namespaces) {
  const rows = lib.FOCUS_KEYS.filter((item) => {
    if (!namespaces) return true;
    return item.namespaces.some((name) => namespaces.includes(name));
  }).filter((item) => Object.prototype.hasOwnProperty.call(enFlat, item.key));
  if (rows.length === 0) return;
  console.log('');
  console.log('Focus controls');
  rows.forEach((item) => {
    const enValue = enFlat[item.key];
    const targetValue = targetFlat[item.key];
    const targetText =
      typeof targetValue === 'string' ? lib.quote(targetValue) : '(missing)';
    const targetChars =
      typeof targetValue === 'string' ? lib.charCount(targetValue) : 0;
    const targetWidth =
      typeof targetValue === 'string' ? lib.displayWidth(targetValue) : 0;
    console.log(`  ${item.key}`);
    console.log(`    ${item.note}`);
    console.log(
      `    en ${lib.quote(enValue)} (${lib.charCount(enValue)} chars, width ${lib.displayWidth(enValue)})  →  ${targetText} (${targetChars} chars, width ${targetWidth})`,
    );
  });
}

function printList(title, rows, limit) {
  console.log('');
  console.log(`${title} (${rows.length})`);
  if (rows.length === 0) {
    console.log('  None.');
    return;
  }
  rows.slice(0, limit).forEach((row) => {
    console.log(`  ${row}`);
  });
  if (rows.length > limit) {
    console.log(
      `  … ${rows.length - limit} more. Re-run with --limit ${rows.length} to see all.`,
    );
  }
}

function printRegional(root, meta, namespaces, enFlat, sharedFlats, options) {
  console.log('');
  console.log('Regional files (not imported by locales/i18n.js)');
  if (meta.regional.length === 0) {
    console.log(`  None for ${meta.file}.`);
    return;
  }
  meta.regional.forEach((fileName) => {
    const filePath = path.join(lib.translationDir(root), fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ${fileName}: not in the checkout.`);
      return;
    }
    const flat = lib.flattenFile(filePath);
    const leafCount = Object.keys(flat).length;
    console.log(
      `  locales/languages/${fileName}: ${leafCount} strings. The preview does not load this file.`,
    );
    const scoped = lib.analyzePair(enFlat, flat, {
      namespaces,
      sharedFlats,
      strict: options.strict,
      ratio: options.ratio,
      minDelta: 4,
      minEnWidth: 4,
    });
    const scopeLabel = namespaces ? namespaces.join(', ') : 'all strings';
    console.log(
      `    In scope (${scopeLabel}): keys=${scoped.inScopeCount} missing=${scoped.missing.length} still_english=${scoped.stillEnglish.length} too_long=${scoped.tooLong.length}`,
    );
    if (namespaces && scoped.inScopeCount > 0 && scoped.missing.length === scoped.inScopeCount) {
      console.log(
        '    This regional file has none of the scoped English strings. It looks like an older bundle.',
      );
    }
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
