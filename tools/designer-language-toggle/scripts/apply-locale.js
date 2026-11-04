#!/usr/bin/env node
/**
 * Force a locale, a language-picker allowlist, or a pseudo-locale
 * in the local dev bundle. Does not edit Crowdin JSON.
 *
 * node tools/designer-language-toggle/scripts/apply-locale.js --locale de
 * node tools/designer-language-toggle/scripts/apply-locale.js --languages en,ja
 * node tools/designer-language-toggle/scripts/apply-locale.js --pseudo longest
 */
const fs = require('fs');
const lib = require('./locale-lib');

const HELP = `
Set the language for a local dev or Replit preview.

Usage
  node tools/designer-language-toggle/scripts/apply-locale.js [options]

Options
  --locale de            Force this language at startup
  --languages en,ja      Limit Settings > General > Current language
  --pseudo accented      English with accents inside ⟦ ⟧, to find text that is not translated
  --pseudo longest       Each string becomes the longest shipped translation
  --languages en,ja      Can be combined with --locale or --pseudo
  --dry-run              Print the plan and do not write files
  --root <path>          Repo root

This edits locales/i18n.js locally and can write:
  locales/designer-locale.override.json
  locales/designer-pseudo.generated.json
  locales/.designer-locale.i18n.js.bak

It never writes locales/languages/*.json.
Reload the preview after it runs. Ask to revert when you are done.
`;

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  if (args.help || (!args.locale && !args.languages && !args.pseudo)) {
    console.log(HELP.trim());
    if (!args.help && !args.locale && !args.languages && !args.pseudo) {
      process.exitCode = 1;
    }
    return;
  }

  const root = lib.findRepoRoot(args.root);
  const locale = args.locale ? lib.resolveLanguage(args.locale) : null;
  if (args.locale && !locale) {
    throw new Error(
      `Unknown language "${args.locale}". Use one of: ${lib.languageList()}.`,
    );
  }
  const languages = lib.splitList(args.languages).map((item) => {
    const code = lib.resolveLanguage(item);
    if (!code) {
      throw new Error(
        `Unknown language "${item}" in --languages. Use one of: ${lib.languageList()}.`,
      );
    }
    return code;
  });
  const uniqueLanguages = [...new Set(languages)];
  if (locale && uniqueLanguages.length > 0 && !uniqueLanguages.includes(locale)) {
    throw new Error(
      `--locale ${locale} is not in --languages ${uniqueLanguages.join(', ')}. Add it to the picker list or drop --locale.`,
    );
  }

  let pseudo = null;
  if (args.locale && args.pseudo) {
    throw new Error(
      'Use either --locale or --pseudo, not both. Pseudo replaces the strings on screen. The language picker can still be limited with --languages.',
    );
  }
  if (args.pseudo && args.pseudo !== true) {
    const mode = String(args.pseudo).toLowerCase();
    if (mode !== 'accented' && mode !== 'longest') {
      throw new Error('--pseudo must be accented or longest.');
    }
    pseudo = mode;
  } else if (args.pseudo === true) {
    throw new Error('Pass --pseudo accented or --pseudo longest.');
  }

  const override = {
    locale: pseudo ? null : locale,
    languages: uniqueLanguages.length > 0 ? uniqueLanguages : null,
    pseudo,
    force: Boolean(locale) || Boolean(pseudo),
  };

  const i18nFile = lib.i18nPath(root);
  const backupFile = lib.backupPath(root);
  const overrideFile = lib.overridePath(root);
  const pseudoFile = lib.pseudoPath(root);
  [overrideFile, pseudoFile, backupFile, i18nFile].forEach((file) => {
    lib.assertNotTranslationFile(root, file);
  });

  console.log('Designer locale preview');
  console.log(lib.RTL_NOTE);
  if (pseudo) {
    console.log(`Mode: pseudo ${pseudo}`);
    console.log(
      "While a stress test is on, Settings shows the language as 'ps'. That's expected.",
    );
  } else if (locale) {
    console.log(`Locale: ${locale} (${lib.SHIPPED[locale].label})`);
    console.log(
      'Startup sets this locale before the saved @MetaMask:language value is read, and skips that saved value so it cannot switch the preview back.',
    );
  } else {
    console.log('Locale: unchanged (the saved language still applies)');
  }
  if (uniqueLanguages.length > 0) {
    console.log(
      `Language picker: ${uniqueLanguages
        .map((code) => `${code} (${lib.SHIPPED[code].label})`)
        .join(', ')}`,
    );
  } else {
    console.log('Language picker: all 15 shipped languages');
  }
  console.log('Crowdin files in locales/languages are not modified.');

  if (args['dry-run']) {
    console.log('');
    console.log('Dry run. No files were written.');
    console.log('To undo a real apply later:');
    console.log(
      '  node tools/designer-language-toggle/scripts/revert-locale.js',
    );
    return;
  }

  const current = fs.readFileSync(i18nFile, 'utf8');
  let original = current;
  if (fs.existsSync(backupFile)) {
    original = fs.readFileSync(backupFile, 'utf8');
  } else if (current.includes(lib.MARKER_START)) {
    throw new Error(
      'locales/i18n.js already has a designer override, and the backup file is missing. Restore locales/i18n.js before applying again.',
    );
  }

  if (pseudo) {
    const bundle = lib.buildPseudoBundle(root, pseudo);
    lib.assertNotTranslationFile(root, pseudoFile);
    fs.writeFileSync(pseudoFile, JSON.stringify(bundle));
  } else if (fs.existsSync(pseudoFile)) {
    fs.unlinkSync(pseudoFile);
  }

  const patched = lib.transformI18nSource(original, override, {
    pseudoRequire: Boolean(pseudo),
  });
  if (!fs.existsSync(backupFile)) {
    fs.writeFileSync(backupFile, original);
  }
  const tmp = `${i18nFile}.designer-tmp`;
  lib.assertNotTranslationFile(root, tmp);
  try {
    fs.writeFileSync(tmp, patched);
    fs.renameSync(tmp, i18nFile);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  fs.writeFileSync(`${overrideFile}`, `${JSON.stringify(override, null, 2)}\n`);

  console.log('');
  console.log('Applied locally. Nothing was committed.');
  console.log('  Patched: locales/i18n.js');
  console.log('  Backup:  locales/.designer-locale.i18n.js.bak');
  console.log('  Note:    locales/designer-locale.override.json');
  if (pseudo) {
    console.log('  Bundle:  locales/designer-pseudo.generated.json');
  }
  console.log('');
  console.log(
    'Reload the Android preview so the bundler picks up locales/i18n.js. If the preview is a prebuilt APK and does not serve this checkout, use Settings > General > Current language instead.',
  );
  console.log('');
  console.log('Offer to revert this when the review is done:');
  console.log(
    '  node tools/designer-language-toggle/scripts/revert-locale.js',
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
