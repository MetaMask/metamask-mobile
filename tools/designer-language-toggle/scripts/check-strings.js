#!/usr/bin/env node
/**
 * Compare a shipped locale with English.
 *
 * node tools/designer-language-toggle/scripts/check-strings.js --lang de --feature perps
 */
const fs = require('fs');
const path = require('path');
const lib = require('./locale-lib');
const repoAdapter = require('../lib/repo-adapter');
const { loadLearned } = require('../lib/learned');

const HELP = `
Flag translation strings for a designer preview.

Usage
  node tools/designer-language-toggle/scripts/check-strings.js --lang <language> [options]

Options
  --lang de            Language code or name (de, german, ja-JP, pt-BR, …)
  --feature perps      perps, or social (social + social_leaderboard)
  --namespace perps    One or more top-level locale namespaces, comma-separated
  --ratio 1.4          Growth rule for too-long and check-wrapping. Defaults to references/limits.json
  --limits <file>      Hard limits JSON. Defaults to references/limits.json
  --limit 15           How many examples to print per list
  --strict             Also list strings that match English in most languages
  --format json        Print one JSON object instead of the text report
  --root <path>        Repo root. Defaults to the current checkout.

The script only reads locale files. It does not edit them.
Short labels (25 graphemes or fewer in English) can be "too long".
Longer English copy goes to "check wrapping" instead.
Hard limits in references/limits.json are reported as "over the limit".
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
  const limitsPath = args.limits
    ? path.resolve(String(args.limits))
    : lib.defaultLimitsPath();
  const limits = lib.loadLimits(limitsPath);
  const ratio = args.ratio ? Number(args.ratio) : limits.ratio;
  if (!Number.isFinite(ratio) || ratio <= 1) {
    throw new Error('--ratio must be a number greater than 1, for example 1.4.');
  }
  const limit = args.limit ? Number(args.limit) : 15;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive integer.');
  }
  if (args.format && args.format !== 'json') {
    throw new Error('--format only supports json.');
  }

  const meta = lib.SHIPPED[code];
  const enFlat = lib.flattenFile(
    path.join(lib.translationDir(root), 'en.json'),
  );
  const targetPath = path.join(lib.translationDir(root), meta.file);
  const targetFlat = lib.flattenFile(targetPath);
  const sharedFlats = lib.loadShippedFlats(root);
  const learned = loadLearned();
  const report = repoAdapter.checkLanguage(enFlat, targetFlat, {
    lang: code,
    namespaces,
    sharedFlats,
    strict: Boolean(args.strict),
    ratio,
    minDelta: limits.minDelta,
    minEnWidth: limits.minEnglishWidth,
    limits,
    learned,
  });
  const dateValues = lib.scanDateValues(targetFlat, namespaces);
  const dateSource = lib.scanDateSource(root, namespaces);
  const scopeLabel = namespaces ? namespaces.join(', ') : 'all strings';

  if (args.format === 'json') {
    console.log(
      JSON.stringify(
        {
          language: code,
          label: meta.label,
          file: `locales/languages/${meta.file}`,
          scope: scopeLabel,
          rtl: false,
          limits: limitsPath,
          counts: {
            keys: report.inScopeCount,
            missing: report.missing.length,
            stillEnglish: report.stillEnglish.length,
            tooLong: report.tooLong.length,
            checkWrapping: report.checkWrapping.length,
            overLimit: report.overLimit.length,
            placeholderMismatches: report.placeholderMismatches.length,
            pluralGaps: report.pluralGaps.length,
            dateHints: dateValues.length + dateSource.hits.length,
          },
          limitChecks: report.limitChecks,
          missing: report.missing,
          stillEnglish: report.stillEnglish,
          tooLong: report.tooLong,
          checkWrapping: report.checkWrapping,
          overLimit: report.overLimit,
          placeholderMismatches: report.placeholderMismatches,
          pluralGaps: report.pluralGaps,
          dateValues,
          dateSource: dateSource.hits,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Language: ${code} (${meta.label})`);
  console.log(`File: locales/languages/${meta.file}`);
  console.log(
    'This is the file locales/i18n.js imports. The Android preview uses this file.',
  );
  console.log(`Scope: ${scopeLabel}`);
  console.log(`Limits: ${path.relative(root, limitsPath) || limitsPath}`);
  console.log(lib.RTL_NOTE);
  console.log('');
  console.log(`Keys in scope: ${report.inScopeCount}`);
  console.log(`Missing: ${report.missing.length}`);
  console.log(`Still English: ${report.stillEnglish.length}`);
  console.log(`Over the limit: ${report.overLimit.length}`);
  console.log(`Too long: ${report.tooLong.length}`);
  console.log(`Check wrapping: ${report.checkWrapping.length}`);
  console.log(`Placeholder mismatches: ${report.placeholderMismatches.length}`);
  console.log(`Plural forms partly missing: ${report.pluralGaps.length}`);
  console.log(`Skipped as shared names or tokens: ${report.skippedShared.length}`);
  console.log(`Extra keys not in English: ${report.extra}`);
  console.log(
    `Length rule: "over the limit" compares character count, including placeholders, with references/limits.json (Pro buttons 10, Post to feed 20). A width hint counts CJK, kana, and hangul as 2 and does not decide the limit. "Too long" is a hint for English of ${report.cutoff} characters or fewer that grew to at least ${ratio}x and 4 width units. Longer English copy is "check wrapping", because sentences wrap.`,
  );

  printList(
    'Over the limit',
    report.overLimit.map(
      (row) =>
        `${row.key}  limit ${row.maxCharacters}  ${lib.quote(row.target)} (${row.characters} characters, width hint ${row.widthHint})`,
    ),
    limit,
  );
  printLimitChecks(report.limitChecks);
  printList(
    'Too long',
    report.tooLong.map((row) => formatLength(row)),
    limit,
  );
  printFocus(enFlat, targetFlat, namespaces, report.limitChecks);
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
    'Check wrapping',
    report.checkWrapping.map((row) => formatLength(row)),
    limit,
  );
  printList(
    'Placeholder mismatches',
    report.placeholderMismatches.map(
      (row) =>
        `${row.key}  missing ${row.missing.join(', ') || 'none'}  extra ${row.extra.join(', ') || 'none'}`,
    ),
    limit,
  );
  printList(
    'Plural forms partly missing',
    report.pluralGaps.map(
      (row) =>
        `${row.stem}  has ${row.forms.join(', ')} in English, missing ${row.missingForms.join(', ')}`,
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
    lang: code,
    strict: Boolean(args.strict),
    ratio,
    minDelta: limits.minDelta,
    minEnWidth: limits.minEnglishWidth,
    limits,
    learned,
  });

  if (!args.strict && report.skippedShared.length > 0) {
    console.log('');
    console.log(
      'Strings shorter than 3 characters, strings with no real word once placeholders are removed, and strings that match English in most languages are left out of Still English. Re-run with --strict to include the shared ones.',
    );
  }

  if (report.learned && report.learned.length > 0) {
    printList(
      'Linguist notes',
      report.learned.map((row) => `${row.key}  ${row.message}`),
      limit,
    );
  }

  if (code === 'ru') {
    console.log('');
    console.log(
      'Russian plural files only ship one and other. CLDR also defines few and many for Russian. This app uses react-native-i18n with i18n-js 3, whose default pluralizer only looks up zero, one, and other, so few and many are not used.',
    );
  }

  console.log('');
  console.log(
    `SUMMARY ${code} ${scopeLabel} missing=${report.missing.length} still_english=${report.stillEnglish.length} too_long=${report.tooLong.length} check_wrapping=${report.checkWrapping.length} over_limit=${report.overLimit.length} placeholder_mismatches=${report.placeholderMismatches.length} plural_gaps=${report.pluralGaps.length} date_hints=${dateValues.length + dateSource.hits.length}`,
  );
  console.log(
    'No locale JSON was edited. Crowdin owns locales/languages. To change the preview language, use apply-locale.js.',
  );
}

function formatLength(row) {
  return `${row.key}  en ${lib.quote(row.en)} (${row.enChars} graphemes, width ${row.enWidth})  →  ${lib.quote(row.target)} (${row.targetChars} graphemes, width ${row.targetWidth}, ${row.ratio.toFixed(2)}x)`;
}

function printLimitChecks(rows) {
  if (!rows || rows.length === 0) return;
  console.log('');
  console.log('Hard limits');
  rows.forEach((row) => {
    const shown =
      row.status === 'missing'
        ? 'not in this file'
        : `${lib.quote(row.target)} (${row.characters} characters, width hint ${row.widthHint})`;
    console.log(
      `  ${row.key}  limit ${row.maxCharacters}  ${row.status}  ${shown}`,
    );
    if (row.where) console.log(`    ${row.where}`);
  });
}

function printFocus(enFlat, targetFlat, namespaces, limitChecks) {
  const limited = new Set((limitChecks || []).map((row) => row.key));
  const rows = lib.FOCUS_KEYS.filter((item) => !limited.has(item.key))
    .filter((item) => {
      if (!namespaces) return true;
      return item.namespaces.some((name) => namespaces.includes(name));
    })
    .filter((item) => Object.prototype.hasOwnProperty.call(enFlat, item.key));
  if (rows.length === 0) return;
  console.log('');
  console.log('Other focus strings');
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
      `    en ${lib.quote(enValue)} (${lib.charCount(enValue)} graphemes, width ${lib.displayWidth(enValue)})  →  ${targetText} (${targetChars} graphemes, width ${targetWidth})`,
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
    const scoped = repoAdapter.checkLanguage(enFlat, flat, {
      lang: options.lang,
      namespaces,
      sharedFlats,
      strict: options.strict,
      ratio: options.ratio,
      minDelta: options.minDelta,
      minEnWidth: options.minEnWidth,
      limits: options.limits,
      learned: options.learned,
    });
    const scopeLabel = namespaces ? namespaces.join(', ') : 'all strings';
    console.log(
      `    In scope (${scopeLabel}): keys=${scoped.inScopeCount} missing=${scoped.missing.length} still_english=${scoped.stillEnglish.length} too_long=${scoped.tooLong.length} check_wrapping=${scoped.checkWrapping.length} over_limit=${scoped.overLimit.length}`,
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
