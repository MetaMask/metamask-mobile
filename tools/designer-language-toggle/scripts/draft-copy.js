#!/usr/bin/env node
/**
 * Draft translations for new English copy and preview them locally.
 * Does not edit locales/languages/*.json. The overlay and review file are gitignored.
 *
 * The drafter is the agent following SKILL.md. A model API stays off
 * unless DESIGNER_DRAFT_MODEL_URL is set and --model is passed, and even
 * then this script does not call the network itself.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./locale-lib');
const drafts = require('../lib/drafts');

const HELP = `
Draft translations for new English copy, then preview them in the dev app.

Usage
  node tools/designer-language-toggle/scripts/draft-copy.js --gather --lang ja,pt
  node tools/designer-language-toggle/scripts/draft-copy.js --gather --lang ja,pt --feature perps
  node tools/designer-language-toggle/scripts/draft-copy.js --gather --lang ja --keys demo.hello
  node tools/designer-language-toggle/scripts/draft-copy.js --write drafts.json --lang ja,pt
  node tools/designer-language-toggle/scripts/draft-copy.js --export
  node tools/designer-language-toggle/scripts/draft-copy.js --import locales/designer-drafts.review.csv
  node tools/designer-language-toggle/scripts/draft-copy.js --preview --locale ja
  node tools/designer-language-toggle/scripts/draft-copy.js --marker

--gather lists strings that still need a draft and reuses shipped or learned text.
The agent fills the unmatched ones. --write validates {{placeholders}}, runs the
length check, and saves the gitignored overlay.
--preview turns the overlay on in the dev bundle only.
--marker is optional and off unless you pass it. It prefixes new drafts with ⟦draft⟧.
--model does nothing unless DESIGNER_DRAFT_MODEL_URL is also set, and this script
still does not call that URL. The agent writes the drafts.

Re-importing a review file never clears linguist columns that already have text.
`;

function targetLangs(args) {
  const codes = lib.splitList(args.lang || 'ja,pt').map((item) => {
    const code = lib.resolveLanguage(item);
    if (!code || code === 'en') {
      throw new Error(`Unknown target language "${item}". Use a shipped language code, for example ja or pt.`);
    }
    return code;
  });
  return [...new Set(codes)];
}

function loadFlats(root) {
  const flats = lib.loadShippedFlats(root);
  flats.regional = {};
  Object.keys(lib.SHIPPED).forEach((code) => {
    flats.regional[code] = {};
    (lib.SHIPPED[code].regional || []).forEach((fileName) => {
      const filePath = path.join(lib.translationDir(root), fileName);
      if (!fs.existsSync(filePath)) return;
      flats.regional[code][fileName] = lib.flattenFile(filePath);
    });
  });
  return flats;
}

function printFitSummary(overlay) {
  const rows = drafts.reviewRowsFromOverlay(overlay);
  const bad = rows.filter((row) => row.fit !== 'fits');
  console.log(`Drafts ready: ${rows.length}. Fit check: ${rows.length - bad.length} fit, ${bad.length} to review.`);
  bad.slice(0, 15).forEach((row) => {
    console.log(`  ${row.location}  ${row.fit}  source ${row.source}`);
  });
}

function gather(root, args) {
  const langs = targetLangs(args);
  const flats = loadFlats(root);
  const keys = lib.splitList(args.keys);
  const items = drafts.gatherStrings(flats.en, {
    langs,
    keys,
    namespace: args.feature || '',
    flats,
  });
  const learned = drafts.loadLearned();
  const memory = {};
  items.forEach((item) => {
    memory[item.id] = {};
    langs.forEach((lang) => {
      const resolved = drafts.resolveDraft(item, lang, { langs, flats, learned, proposals: {} });
      memory[item.id][lang] = resolved.entry
        ? { text: resolved.entry.text, source: resolved.entry.source }
        : null;
    });
  });
  const needed = {
    langs,
    items: items.map((item) => ({
      ...item,
      memory: memory[item.id],
    })),
  };
  const filePath = drafts.neededPath(root);
  lib.assertNotTranslationFile(root, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(needed, null, 2)}\n`);
  const unmatched = items.filter((item) => langs.some((lang) => !memory[item.id][lang]));
  console.log(`Gathered ${items.length} strings for ${langs.join(', ')}.`);
  console.log(`${unmatched.length} still need a draft. Shipped and learned matches are already filled.`);
  console.log(`List: ${path.relative(root, filePath)}`);
  if (args.model) {
    if (!drafts.modelDraftEnabled(process.env)) {
      console.log('Draft model is off. No model URL is set, and none is required. Write the drafts yourself.');
    } else {
      console.log('A model URL is set, but this script does not call it. Write the drafts yourself.');
    }
  }
  return needed;
}

function writeDrafts(root, args) {
  const filePath = args.write;
  if (!filePath || filePath === true) throw new Error('Pass --write with the draft JSON file.');
  const proposed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langs = targetLangs(args);
  const flats = loadFlats(root);
  const neededFile = drafts.neededPath(root);
  let items;
  if (fs.existsSync(neededFile)) {
    const needed = JSON.parse(fs.readFileSync(neededFile, 'utf8'));
    items = needed.items || [];
  } else {
    items = drafts.gatherStrings(flats.en, {
      langs,
      keys: Object.keys(proposed[langs[0]] || proposed),
      flats,
    });
  }
  const existing = drafts.loadOverlay(drafts.overlayPath(root));
  const composed = drafts.composeDrafts(items, proposed.locales || proposed, {
    langs,
    flats,
    learned: drafts.loadLearned(),
    marker: Boolean(args.marker) || existing.marker === true,
  });
  if (composed.errors.length) {
    composed.errors.forEach((error) => console.error(error));
    throw new Error('Some drafts failed the placeholder check or still need text. Nothing partial was required; fix the list and write again.');
  }
  const overlay = drafts.mergeOverlay(existing, composed.overlay);
  const destination = drafts.overlayPath(root);
  lib.assertNotTranslationFile(root, destination);
  drafts.assertDevOnly(overlay);
  drafts.saveOverlay(destination, overlay);
  console.log(`Saved ${path.relative(root, destination)}. It is gitignored and is not a Crowdin file.`);
  printFitSummary(overlay);
  const review = drafts.reviewPath(root, 'csv');
  drafts.writeReview(review, drafts.reviewRowsFromOverlay(overlay));
  drafts.writeReview(drafts.reviewPath(root, 'xlsx'), drafts.reviewRowsFromOverlay(overlay));
  console.log(`Review file: ${path.relative(root, review)}`);
  console.log('Preview it with: node tools/designer-language-toggle/scripts/apply-locale.js --locale ja --drafts');
}

function exportReview(root) {
  const overlay = drafts.loadOverlay(drafts.overlayPath(root));
  const rows = drafts.reviewRowsFromOverlay(overlay);
  const csvFile = drafts.reviewPath(root, 'csv');
  const xlsxFile = drafts.reviewPath(root, 'xlsx');
  lib.assertNotTranslationFile(root, csvFile);
  drafts.writeReview(csvFile, rows);
  drafts.writeReview(xlsxFile, rows);
  console.log(`Wrote ${rows.length} rows.`);
  console.log(path.relative(root, csvFile));
  console.log(path.relative(root, xlsxFile));
}

function importReview(root, filePath) {
  if (!filePath || filePath === true) throw new Error('Pass --import with the review CSV or XLSX.');
  const records = drafts.readReview(filePath);
  const overlay = drafts.loadOverlay(drafts.overlayPath(root));
  const learned = drafts.loadLearned();
  const imported = drafts.importRecords(records, overlay, learned);
  const destination = drafts.overlayPath(root);
  lib.assertNotTranslationFile(root, destination);
  drafts.assertDevOnly(imported.overlay);
  drafts.saveOverlay(destination, imported.overlay);
  drafts.saveLearned(path.join(root, 'tools/designer-language-toggle/references/learned'), imported.learned);
  console.log('Imported linguist columns. Empty cells did not clear existing linguist notes.');
  console.log('Accepted edits are in the learned store and the dev preview overlay.');
}

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help || (!args.gather && !args.write && !args.export && !args.import && !args.preview)) {
    console.log(HELP.trim());
    if (!args.help) process.exitCode = 1;
    return;
  }
  const root = lib.findRepoRoot(args.root);
  if (args.gather) gather(root, args);
  if (args.write) writeDrafts(root, args);
  if (args.export) exportReview(root);
  if (args.import) importReview(root, args.import);
  if (args.preview) {
    console.log('Turn the draft overlay on in the dev bundle:');
    console.log('  node tools/designer-language-toggle/scripts/apply-locale.js --drafts --locale ja');
    console.log('Reload the preview. A release build does not show drafts.');
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
