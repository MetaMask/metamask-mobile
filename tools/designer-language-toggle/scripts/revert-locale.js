#!/usr/bin/env node
/**
 * Restore locales/i18n.js from the backup taken by apply-locale.js
 * and delete the generated preview files.
 *
 * node tools/designer-language-toggle/scripts/revert-locale.js
 */
const fs = require('fs');
const lib = require('./locale-lib');

function removeIfPresent(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Restore the locale preview.\n\n  node tools/designer-language-toggle/scripts/revert-locale.js [--root <path>]',
    );
    return;
  }
  const root = lib.findRepoRoot(args.root);
  const i18nFile = lib.i18nPath(root);
  const backupFile = lib.backupPath(root);
  const overrideFile = lib.overridePath(root);
  const pseudoFile = lib.pseudoPath(root);
  const tmpFile = `${i18nFile}.designer-tmp`;
  [i18nFile, backupFile, overrideFile, pseudoFile, tmpFile].forEach((file) => {
    lib.assertNotTranslationFile(root, file);
  });
  const removedTmp = removeIfPresent(tmpFile);

  if (!fs.existsSync(backupFile)) {
    const current = fs.readFileSync(i18nFile, 'utf8');
    if (current.includes(lib.MARKER_START)) {
      throw new Error(
        'locales/i18n.js contains a designer override, but locales/.designer-locale.i18n.js.bak is missing. This script will not guess. Restore locales/i18n.js from git, then delete locales/designer-locale.override.json and locales/designer-pseudo.generated.json if they are still there.',
      );
    }
    const removedOverride = removeIfPresent(overrideFile);
    const removedPseudo = removeIfPresent(pseudoFile);
    if (removedOverride || removedPseudo || removedTmp) {
      console.log('Removed leftover preview files. locales/i18n.js was already clean.');
      return;
    }
    console.log('Nothing to revert. The designer locale preview is not applied.');
    return;
  }

  const original = fs.readFileSync(backupFile, 'utf8');
  const tmp = `${i18nFile}.designer-tmp`;
  fs.writeFileSync(tmp, original);
  fs.renameSync(tmp, i18nFile);
  fs.unlinkSync(backupFile);
  removeIfPresent(overrideFile);
  removeIfPresent(pseudoFile);
  console.log('Reverted the designer locale preview.');
  console.log(
    'locales/i18n.js is back to the copy saved before the first apply. Edits made to that file after the preview was applied were removed with it.',
  );
  console.log('Reload the preview to return to the saved in-app language.');
  console.log(lib.RTL_NOTE);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
