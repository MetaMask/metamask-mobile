#!/usr/bin/env node
/**
 * Check design-stage copy that is not in the repo yet.
 * Does not machine-translate and does not edit locales/languages.
 *
 * node tools/designer-language-toggle/scripts/check-file.js --file samples/kalshi-predict.csv --lang ja
 * node tools/designer-language-toggle/scripts/check-file.js --file samples/kalshi-predict.csv --pseudo
 */
const path = require('path');
const lib = require('./locale-lib');
const { checkDesignFile, pseudoText } = require('../lib/file-adapter');
const { loadLearned } = require('../lib/learned');

const HELP = `
Check a strings.csv or strings.json exported for a screen that is not in the app yet.

Usage
  node tools/designer-language-toggle/scripts/check-file.js --file <path> [--lang ja] [--pseudo]

Options
  --file <path>          CSV or JSON. CSV columns: id, layer_name, frame_path, text, chars, kind
  --lang ja              Report that this language has no translation yet. Does not invent one.
  --pseudo               Accent and pad the English. Labeled pseudo. Not a translation.
  --include-skipped      Also check rows whose kind is placeholder_or_annotation or number_or_data
  --format json          One JSON object
  --root <path>          Repo root, used to find limits and the learning store

Rows with kind placeholder_or_annotation or number_or_data are skipped unless --include-skipped.
`;

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(HELP.trim());
    if (!args.file && !args.help) process.exitCode = 1;
    return;
  }
  if (args.format && args.format !== 'json') {
    throw new Error('--format only supports json.');
  }
  const lang = args.lang ? lib.resolveLanguage(String(args.lang)) : null;
  if (args.lang && !lang) {
    throw new Error(
      `Unknown language "${args.lang}". Use one of: ${lib.languageList()}.`,
    );
  }
  const root = lib.findRepoRoot(args.root);
  const limits = lib.loadLimits(lib.defaultLimitsPath());
  const learned = loadLearned();
  const filePath = path.resolve(String(args.file));
  const result = checkDesignFile(filePath, {
    lang,
    limits,
    learned,
    pseudo: Boolean(args.pseudo),
    includeSkipped: Boolean(args['include-skipped']),
    ratio: args.ratio ? Number(args.ratio) : limits.ratio,
  });

  if (args.format === 'json') {
    console.log(
      JSON.stringify(
        {
          file: path.relative(root, filePath),
          language: lang,
          skipped: result.skipped.map((row) => ({
            id: row.id,
            kind: row.context.kind,
            source: row.source_text,
          })),
          lengths: result.lengths.map((row) => ({
            key: row.key,
            source: row.source,
            feature: row.feature,
            component: row.component,
            description: row.description,
            max_length: row.maxCharacters,
            characters: row.characters,
            width_hint: row.widthHint,
            status: row.status,
          })),
          report: result.report,
          pseudo: result.pseudo
            ? {
                label: result.pseudo.label,
                note: result.pseudo.note,
                strings: result.kept.map((row) => ({
                  id: row.id,
                  source: row.source_text,
                  pseudo_text: pseudoText(row.source_text),
                  label: 'pseudo',
                })),
              }
            : null,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Design file: ${path.relative(root, filePath)}`);
  console.log(
    'This is not repo copy and it is not a translation. No preview locale was changed.',
  );
  console.log(lib.RTL_NOTE);
  console.log('');
  console.log(`Rows read: ${result.rowsRead}`);
  console.log(`Rows skipped: ${result.skipped.length}`);
  console.log(`Rows checked: ${result.rowsChecked}`);
  console.log(`Unique strings: ${result.unique}`);
  if (result.skipped.length > 0) {
    result.skipped.forEach((row) => {
      console.log(
        `  skip ${row.id}  ${row.context.visible === false ? 'hidden' : `kind ${row.context.kind}`}`,
      );
    });
  }
  console.log('');
  console.log('English length');
  result.lengths.forEach((row) => {
    const limit =
      row.bucket === 'wrap'
        ? 'check wrapping'
        : row.maxCharacters === null
          ? 'no hard limit for this id'
          : `limit ${row.maxCharacters} ${row.status}`;
    console.log(
      `  ${row.key}  ${lib.quote(row.source)}  ${row.characters} characters, width hint ${row.widthHint}, ${limit}`,
    );
    if (row.component || (row.screens && row.screens.length)) {
      console.log(
        `    ${row.component || 'layer'}  ${(row.screens || []).join('; ')}`.trimEnd(),
      );
    }
  });

  if (result.report) {
    console.log('');
    console.log(
      `${lang} has no translation in this file unless a translations column was provided.`,
    );
    console.log(`Missing: ${result.report.missing.length}`);
    console.log(`Still English: ${result.report.stillEnglish.length}`);
    console.log(`Over the limit: ${result.report.overLimit.length}`);
    console.log(`Too long: ${result.report.tooLong.length}`);
    console.log(`Check wrapping: ${result.report.checkWrapping.length}`);
    if (result.report.learned.length > 0) {
      console.log('Linguist notes:');
      result.report.learned.forEach((row) => {
        console.log(`  ${row.key}  ${row.message}`);
      });
    }
  }

  if (result.pseudo) {
    console.log('');
    console.log(`Pseudo: ${result.pseudo.note}`);
    const padded = (result.pseudo.controls || []).length;
    console.log(
      `Pseudo length: ${padded} button or tab labels exceed their limit when padded. That is not a translation.`,
    );
    result.kept.forEach((row) => {
      console.log(`  ${row.id}  ${pseudoText(row.source_text)}`);
    });
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
