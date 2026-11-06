#!/usr/bin/env node
/**
 * Check a Figma frame, section, or page in one or more languages.
 * Does not machine-translate and does not edit locales/languages.
 *
 * node tools/designer-language-toggle/scripts/check-figma.js --url "<figma url>" --lang de
 */
const lib = require('./locale-lib');
const figma = require('../lib/figma-adapter');
const { checkDesignFile } = require('../lib/file-adapter');
const { buildBreakReport } = require('../lib/figma-report');
const { loadLearned } = require('../lib/learned');

const HELP = `
Check a Figma screen without exporting a spreadsheet first.

Usage
  node tools/designer-language-toggle/scripts/check-figma.js --url "<figma url>" --lang de
  node tools/designer-language-toggle/scripts/check-figma.js --url "<figma url>" --lang de,ja,ru --pseudo

Options
  --url <figma url>     A design link with node-id. A branch link uses the branch key.
  --lang de,ja          One or more shipped languages. Real translations are shown when the English already ships.
  --pseudo              Accent and pad the English. Labeled pseudo. Not a translation.
  --json                Print one JSON object. --format json does the same.
  --root <path>         Repo root

The read stays in tools/designer-language-toggle/.cache/figma/ and is gitignored.
`;

function parseLangs(value) {
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const code = lib.resolveLanguage(part);
      if (!code) {
        throw new Error(`Unknown language "${part}". Use one of: ${lib.languageList()}.`);
      }
      return code;
    });
}

function lineFor(row) {
  const screens = (row.screens || []).slice(0, 4).join(', ');
  return `  ${JSON.stringify(row.source)}  ${row.characters} characters, ${row.width_px === null ? 'no width' : `${row.width_px}px`}${screens ? `, ${screens}` : ''}`;
}

function printReport(report, langs) {
  console.log('What will break');
  console.log('');
  console.log(`Already over in English (${report.alreadyOver.length})`);
  if (report.alreadyOver.length === 0) console.log('  None.');
  report.alreadyOver.slice(0, 20).forEach((row) => console.log(lineFor(row)));
  console.log('');
  console.log(`Breaks with real translations (${report.breaks.length})`);
  if (report.breaks.length === 0) console.log('  None.');
  report.breaks.slice(0, 20).forEach((row) => {
    console.log(lineFor(row));
    langs.forEach((lang) => {
      const item = row.real && row.real.perLang[lang];
      if (!item) return;
      const mark = item.over10 ? ' over 10' : '';
      console.log(`    ${lang} ${JSON.stringify(item.text)} (${item.characters}${mark})`);
    });
  });
  console.log('');
  console.log(`At risk, estimate only (${report.atRisk.length})`);
  if (report.atRisk.length === 0) console.log('  None.');
  report.atRisk.slice(0, 15).forEach((row) => {
    console.log(`${lineFor(row)}  about ${row.expected} if it grows 1.4×`);
  });
  console.log('');
  console.log(
    `Fits: ${report.fits.length} short controls stay within 10 characters in the languages you asked about, or in the 1.4× estimate when the English is new.`,
  );
}

async function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  const wantJson = Boolean(args.json) || args.format === 'json';
  if (args.help || !args.url) {
    console.log(HELP.trim());
    if (!args.url && !args.help) process.exitCode = 1;
    return;
  }
  if (!args.lang) {
    throw new Error('Pass --lang with one or more languages, for example --lang de or --lang de,ja.');
  }
  const langs = parseLangs(args.lang);
  const root = lib.findRepoRoot(args.root);
  const token = figma.readToken(root);
  if (!token) {
    throw new Error(figma.missingTokenMessage());
  }
  const parsed = figma.parseFigmaUrl(String(args.url));
  const rules = figma.loadRules(
    require('path').join(root, 'tools/designer-language-toggle/references/figma-rules.json'),
  );
  const records = await figma.loadTextNodes(parsed.fileKey, parsed.nodeId, token, fetch, rules);
  const cache = figma.writeCache(root, parsed.fileKey, parsed.nodeId, records);
  const limits = lib.loadLimits(lib.defaultLimitsPath());
  const learned = loadLearned();
  const checked = checkDesignFile(cache, {
    lang: langs[0],
    limits,
    learned,
    pseudo: Boolean(args.pseudo),
    ratio: args.ratio ? Number(args.ratio) : limits.ratio,
  });
  const shared = lib.loadShippedFlats(root);
  const report = buildBreakReport(checked.lengths, { langs, sharedFlats: shared });
  if (wantJson) {
    console.log(JSON.stringify({
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      rowsRead: checked.rowsRead,
      skipped: checked.skipped.length,
      unique: checked.unique,
      alreadyOver: report.alreadyOver,
      breaks: report.breaks,
      atRisk: report.atRisk,
      fits: report.fits.length,
      pseudo: checked.pseudo ? checked.pseudo.note : null,
    }, null, 2));
    return;
  }
  console.log(`Figma file ${parsed.fileKey}, frame ${parsed.nodeId}`);
  console.log(`Rows read: ${checked.rowsRead}`);
  console.log(`Rows skipped: ${checked.skipped.length}`);
  console.log(`Rows checked: ${checked.rowsChecked}`);
  console.log(`Unique strings: ${checked.unique}`);
  console.log(lib.RTL_NOTE);
  console.log('');
  printReport(report, langs);
  if (checked.pseudo) {
    console.log('');
    console.log(`Pseudo: ${checked.pseudo.note}`);
  }
}

main().catch((error) => {
  console.error(error && error.message ? error.message : 'The Figma check failed.');
  process.exit(1);
});
