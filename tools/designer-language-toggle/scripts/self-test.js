#!/usr/bin/env node
/**
 * Fixture checks for the designer language scripts.
 * Also transforms the real locales/i18n.js in a temp folder and reverts it there.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const lib = require('./locale-lib');

const scriptsDir = __dirname;
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
  }
}

function runNode(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'designer-locale-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ type: 'module', name: 'designer-locale-fixture' })}\n`,
  );
  const en = {
    perps: {
      card: { close: 'Close', reverse: 'Reverse', share: 'Share' },
      brand: 'Perps',
      composer: 'Close composer',
      missing: 'Missing in German',
      date_hint: 'Use MM/DD/YYYY',
    },
    other: { nope: 'Not in scope' },
  };
  const de = {
    perps: {
      card: {
        close: 'Schließen',
        reverse: 'Реверсировать',
        share: 'Teilen',
      },
      brand: 'Perps',
      composer: 'Close composer',
      date_hint: '01/02/2024',
    },
  };
  writeJson(path.join(root, 'locales', 'languages', 'en.json'), en);
  writeJson(path.join(root, 'locales', 'languages', 'de.json'), de);
  Object.keys(lib.SHIPPED).forEach((code) => {
    if (code === 'en' || code === 'de') return;
    writeJson(path.join(root, 'locales', 'languages', lib.SHIPPED[code].file), {
      perps: { brand: 'Perps', composer: 'translated' },
    });
  });
  const realI18n = fs.readFileSync(
    path.join(lib.findRepoRoot(), 'locales', 'i18n.js'),
    'utf8',
  );
  fs.writeFileSync(path.join(root, 'locales', 'i18n.js'), realI18n);
  fs.mkdirSync(path.join(root, 'app', 'components', 'UI', 'Perps'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, 'app', 'components', 'UI', 'Perps', 'format-fixture.ts'),
    "export const sample = getIntlDateTimeFormatter('en-US', { hour12: true });\n",
  );
  return { root, realI18n };
}

function testWidthAndAccent() {
  assert(lib.displayWidth('Close') === 5, 'Close width');
  assert(lib.charCount('Schließen') === 9, 'Schließen chars');
  assert(lib.displayWidth('閉じる') === 6, 'Japanese close width');
  assert(lib.charCount('Реверсировать') === 13, 'Russian reverse chars');
  assert(lib.charCount('Compartilhar') === 12, 'Portuguese share chars');
  const accented = lib.accentString('Hello {{name}}');
  assert(accented.includes('{{name}}'), 'placeholders survive accenting');
  assert(accented.startsWith('⟦') && accented.endsWith('⟧'), 'accent brackets');
  assert(lib.resolveLanguage('ja-JP') === 'ja', 'ja-JP alias');
  assert(lib.resolveLanguage('Portuguese') === 'pt', 'portuguese alias');
  assert(lib.resolveLanguage('pt-BR') === 'pt', 'pt-BR alias');
}

function testAnalyze(root) {
  const enFlat = lib.flattenFile(
    path.join(root, 'locales', 'languages', 'en.json'),
  );
  const deFlat = lib.flattenFile(
    path.join(root, 'locales', 'languages', 'de.json'),
  );
  const shared = lib.loadShippedFlats(root);
  const report = lib.analyzePair(enFlat, deFlat, {
    namespaces: ['perps'],
    sharedFlats: shared,
    strict: false,
    ratio: 1.4,
    minDelta: 4,
    minEnWidth: 4,
  });
  const missingKeys = report.missing.map((row) => row.key);
  assert(missingKeys.includes('perps.missing'), 'missing key detected');
  assert(
    !missingKeys.includes('other.nope'),
    'namespace filter keeps other.nope out',
  );
  const still = report.stillEnglish.map((row) => row.key);
  assert(still.includes('perps.composer'), 'still-English composer');
  assert(!still.includes('perps.brand'), 'shared Perps token is skipped');
  const longKeys = report.tooLong.map((row) => row.key);
  assert(longKeys.includes('perps.card.close'), 'Schließen is too long vs Close');
  assert(
    longKeys.includes('perps.card.reverse'),
    'long reverse is too long',
  );
  assert(!longKeys.includes('perps.card.share'), 'Teilen is not over the delta');
  const dates = lib.scanDateValues(deFlat, ['perps']);
  assert(
    dates.some((row) => row.key === 'perps.date_hint'),
    'numeric date hint in the locale value',
  );
  const source = lib.scanDateSource(root, ['perps']);
  assert(
    source.hits.some((row) => row.names.includes('hard-coded-en-US-date')),
    'en-US source hint',
  );
}

function testRealI18nTransform(realI18n) {
  const patched = lib.transformI18nSource(
    realI18n,
    {
      locale: 'de',
      languages: ['en', 'ja'],
      pseudo: null,
      force: true,
    },
    { pseudoRequire: false },
  );
  assert(patched.includes(lib.MARKER_START), 'marker inserted');
  assert(patched.includes('"locale": "de"'), 'locale inlined');
  assert(patched.includes('const all = {'), 'getLanguages reads an object');
  assert(
    patched.includes('__DESIGNER_LOCALE_OVERRIDE.force'),
    'startup skips saved language when force is on',
  );
  assert(!patched.includes("require('./designer-pseudo.generated.json')"), 'no pseudo require');
  let threw = false;
  try {
    lib.transformI18nSource(patched, { locale: 'fr', languages: null, pseudo: null, force: true }, {
      pseudoRequire: false,
    });
  } catch (error) {
    threw = /already contains/.test(error.message);
  }
  assert(threw, 'second transform without revert is refused');

  let blocked = false;
  try {
    lib.assertNotTranslationFile(
      lib.findRepoRoot(),
      path.join(lib.findRepoRoot(), 'locales', 'languages', 'de.json'),
    );
  } catch (error) {
    blocked = /Crowdin/.test(error.message);
  }
  assert(blocked, 'writes under locales/languages are refused');
}

function testApplyRevert(root, realI18n) {
  const apply = path.join(scriptsDir, 'apply-locale.js');
  const revert = path.join(scriptsDir, 'revert-locale.js');
  const check = path.join(scriptsDir, 'check-strings.js');

  const dry = runNode(
    [apply, '--root', root, '--locale', 'german', '--dry-run'],
    root,
  );
  assert(dry.status === 0, `dry-run status ${dry.status} ${dry.stderr}`);
  assert(
    fs.readFileSync(path.join(root, 'locales', 'i18n.js'), 'utf8') === realI18n,
    'dry-run does not edit i18n.js',
  );

  const applied = runNode(
    [apply, '--root', root, '--locale', 'de', '--languages', 'de,en'],
    root,
  );
  assert(applied.status === 0, `apply status ${applied.status} ${applied.stderr}`);
  const patched = fs.readFileSync(path.join(root, 'locales', 'i18n.js'), 'utf8');
  assert(patched.includes('"locale": "de"'), 'applied locale de');
  assert(
    patched.includes('"de"') && patched.includes('"en"'),
    'allowlist present',
  );
  const syntax = runNode(['--check', path.join(root, 'locales', 'i18n.js')], root);
  assert(syntax.status === 0, `patched i18n syntax ${syntax.stderr}`);

  const reverted = runNode([revert, '--root', root], root);
  assert(reverted.status === 0, `revert status ${reverted.status} ${reverted.stderr}`);
  assert(
    fs.readFileSync(path.join(root, 'locales', 'i18n.js'), 'utf8') === realI18n,
    'revert restores the original i18n.js bytes',
  );
  assert(
    !fs.existsSync(path.join(root, 'locales', '.designer-locale.i18n.js.bak')),
    'backup removed',
  );

  const pseudo = runNode(
    [apply, '--root', root, '--pseudo', 'longest'],
    root,
  );
  assert(pseudo.status === 0, `pseudo apply ${pseudo.status} ${pseudo.stderr}`);
  const pseudoFile = path.join(root, 'locales', 'designer-pseudo.generated.json');
  assert(fs.existsSync(pseudoFile), 'pseudo bundle written outside languages/');
  const bundle = JSON.parse(fs.readFileSync(pseudoFile, 'utf8'));
  assert(bundle.perps.card.close === 'Schließen', 'longest close is German');
  assert(
    pseudoFile.includes(`${path.sep}locales${path.sep}designer-pseudo`),
    'pseudo path is the generated file',
  );
  runNode([revert, '--root', root], root);
  assert(!fs.existsSync(pseudoFile), 'pseudo bundle removed on revert');

  const checked = runNode(
    [check, '--root', root, '--lang', 'de', '--namespace', 'perps', '--limit', '10'],
    root,
  );
  assert(checked.status === 0, `check status ${checked.status} ${checked.stderr}`);
  assert(/Missing: 1/.test(checked.stdout), 'cli missing count');
  assert(/Still English: 1/.test(checked.stdout), 'cli still-english count');
  assert(/Too long: 2/.test(checked.stdout), 'cli too-long count');
  assert(/RTL is off/.test(checked.stdout), 'cli reports RTL off');
  assert(/SUMMARY de perps/.test(checked.stdout), 'summary line');
}

function main() {
  testWidthAndAccent();
  const { root, realI18n } = makeFixture();
  try {
    testAnalyze(root);
    testRealI18nTransform(realI18n);
    testApplyRevert(root, realI18n);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures > 0) {
    console.error(`${failures} failed`);
    process.exit(1);
  }
  console.log('self-test passed');
}

main();
