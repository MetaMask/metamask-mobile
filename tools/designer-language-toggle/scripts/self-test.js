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
  assert(lib.charCount('Schließen') === 9, 'Schließen graphemes');
  assert(lib.displayWidth('閉じる') === 6, 'Japanese close width');
  assert(lib.charCount('Реверсировать') === 13, 'Russian reverse graphemes');
  assert(lib.charCount('Compartilhar') === 12, 'Portuguese share graphemes');
  assert(lib.charCount('कि') === 1, 'Hindi grapheme is one cluster');
  assert(lib.displayWidth('कि') === 1, 'Hindi grapheme width is 1');
  assert([...('कि')].length === 2, 'Hindi cluster is two code points');
  const accented = lib.accentString('Hello {{name}}');
  assert(accented.includes('{{name}}'), 'placeholders survive accenting');
  assert(accented.startsWith('⟦') && accented.endsWith('⟧'), 'accent brackets');
  assert(lib.characterCount('Close {{count}}') === 15, 'placeholders count toward length');
  assert(
    lib.scanDateValues({ 'perps.note': 'See you May 2' }, ['perps']).length === 1,
    'May is included in date hints',
  );
  assert(
    lib.screenName('app/components/UI/SocialFeed/components/CopyTradeButton.tsx') ===
      'SocialFeed',
    'screen name does not stop at app/components',
  );
  assert(
    lib.screenName('app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx') ===
      'PerpsHomeView',
    'view folder names the screen',
  );
  assert(
    lib.screenName('app/components/UI/Perps/utils/formatUtils.ts') === 'Perps',
    'Perps files outside Views group under Perps',
  );
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
  const ruled = lib.analyzePair(
    {
      'perps.card.close': 'Close',
      'perps.blurb': 'This sentence is definitely longer than twenty five.',
      'perps.hello': 'Hello {{name}}',
      'perps.orders.one': '{{count}} order',
      'perps.orders.other': '{{count}} orders',
    },
    {
      'perps.card.close': 'Schließen',
      'perps.card.reverse': 'Реверсировать',
      'perps.blurb':
        'Dieser Satz ist absichtlich viel länger als das englische Original und soll umbrechen.',
      'perps.hello': 'Hallo',
      'perps.orders.other': '{{count}} Bestellungen',
    },
    {
      namespaces: ['perps'],
      sharedFlats: { en: {}, de: {} },
      strict: true,
      ratio: 1.4,
      minDelta: 4,
      minEnWidth: 4,
      limits: {
        shortStringMaxGraphemes: 25,
        ratio: 1.4,
        minDelta: 4,
        minEnglishWidth: 4,
        keys: {
          'perps.card.close': { maxCharacters: 10, where: 'fixture button' },
          'perps.card.reverse': { maxCharacters: 10, where: 'fixture reverse' },
          'perps.position.card.post_to_feed': { maxCharacters: 20, where: 'missing' },
        },
      },
    },
  );
  assert(
    !ruled.overLimit.some((row) => row.key === 'perps.card.close'),
    'Schließen is 9 characters and fits a limit of 10',
  );
  assert(
    ruled.overLimit.some((row) => row.key === 'perps.card.reverse'),
    'Реверсировать is over the 10 character limit',
  );
  assert(
    ruled.limitChecks.some(
      (row) => row.key === 'perps.position.card.post_to_feed' && row.status === 'missing',
    ),
    'missing hard-limit key is reported missing, not over',
  );
  assert(
    ruled.checkWrapping.some((row) => row.key === 'perps.blurb'),
    'long English copy goes to check wrapping',
  );
  assert(
    !ruled.tooLong.some((row) => row.key === 'perps.blurb'),
    'long English copy is not also too long',
  );
  assert(
    ruled.placeholderMismatches.some(
      (row) => row.key === 'perps.hello' && row.missing.includes('name'),
    ),
    'dropped placeholder is reported',
  );
  assert(
    ruled.pluralGaps.some(
      (row) => row.stem === 'perps.orders' && row.missingForms.includes('one'),
    ),
    'partial plural gap is reported',
  );
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

function testRuntimeKeys() {
  const root = lib.findRepoRoot();
  const enFlat = lib.flattenFile(path.join(root, 'locales', 'languages', 'en.json'));
  const header = fs.readFileSync(
    path.join(
      root,
      'app/components/UI/SocialFeed/components/PositionCardHeader.tsx',
    ),
    'utf8',
  );
  const headerKeys = lib.extractStringKeys(header, enFlat);
  assert(
    headerKeys.has('social_leaderboard.trader_position.long'),
    'DIRECTION_I18N keys are collected',
  );
  assert(
    headerKeys.has('social_leaderboard.feed.position_card.buy'),
    'SIDE_I18N keys are collected',
  );
  const card = fs.readFileSync(
    path.join(
      root,
      'app/components/UI/SocialFeed/components/SocialFeedPositionCard.tsx',
    ),
    'utf8',
  );
  const cardKeys = lib.extractStringKeys(card, enFlat);
  assert(
    cardKeys.has('social_leaderboard.feed.position_card.entry'),
    'template-string position card keys are expanded',
  );
  const forms = lib.pluralFormsFor(
    enFlat,
    'social_leaderboard.feed.live_stream.new_posts',
  );
  assert(forms && forms.one && forms.other, 'plural parent expands to one and other');
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

  const again = runNode(
    [apply, '--root', root, '--pseudo', 'accented', '--languages', 'en,ja'],
    root,
  );
  assert(again.status === 0, `apply again status ${again.status} ${again.stderr}`);
  const switched = fs.readFileSync(path.join(root, 'locales', 'i18n.js'), 'utf8');
  assert(switched.includes('"pseudo": "accented"'), 'second apply replaces the preview');
  assert(!switched.includes('Run revert-locale.js before applying'), 'no revert-first error');

  const tmp = path.join(root, 'locales', 'i18n.js.designer-tmp');
  fs.writeFileSync(tmp, 'leftover');
  const reverted = runNode([revert, '--root', root], root);
  assert(reverted.status === 0, `revert status ${reverted.status} ${reverted.stderr}`);
  assert(!fs.existsSync(tmp), 'revert removes a leftover designer-tmp file');
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
  assert(/aren't supported in the app yet/.test(checked.stdout), 'cli reports RTL once');
  assert(/SUMMARY de perps/.test(checked.stdout), 'summary line');
}

function testPerpsRegression() {
  const root = lib.findRepoRoot();
  const repoAdapter = require('../lib/repo-adapter');
  const limits = lib.loadLimits(lib.defaultLimitsPath());
  const shared = lib.loadShippedFlats(root);
  const expected = {
    de: { missing: 9, stillEnglish: 73, tooLong: 263, checkWrapping: 111 },
    ja: { missing: 9, stillEnglish: 6, tooLong: 204, checkWrapping: 30 },
    hi: { missing: 9, stillEnglish: 7, tooLong: 21, checkWrapping: 0 },
  };
  Object.keys(expected).forEach((code) => {
    const report = repoAdapter.checkLanguage(shared.en, shared[code], {
      lang: code,
      namespaces: ['perps'],
      sharedFlats: shared,
      strict: false,
      ratio: limits.ratio,
      minDelta: limits.minDelta,
      minEnWidth: limits.minEnglishWidth,
      limits,
      learned: { corrections: [], neverTranslate: [], preferredPhrasing: [] },
    });
    const want = expected[code];
    assert(report.missing.length === want.missing, `${code} missing ${report.missing.length}`);
    assert(
      report.stillEnglish.length === want.stillEnglish,
      `${code} still English ${report.stillEnglish.length}`,
    );
    assert(report.tooLong.length === want.tooLong, `${code} too long ${report.tooLong.length}`);
    assert(
      report.checkWrapping.length === want.checkWrapping,
      `${code} check wrapping ${report.checkWrapping.length}`,
    );
    assert(report.overLimit.length === 0, `${code} over limit ${report.overLimit.length}`);
  });
  const over = [
    ['ru', 'perps.pro_positions_panel.card.reverse', 13],
    ['tr', 'perps.pro_positions_panel.card.reverse', 13],
    ['pt', 'perps.pro_positions_panel.card.share', 12],
    ['el', 'perps.pro_positions_panel.card.share', 11],
  ];
  over.forEach(([code, key, characters]) => {
    const report = repoAdapter.checkLanguage(shared.en, shared[code], {
      lang: code,
      namespaces: ['perps'],
      sharedFlats: shared,
      strict: false,
      ratio: limits.ratio,
      minDelta: limits.minDelta,
      minEnWidth: limits.minEnglishWidth,
      limits,
    });
    const row = report.overLimit.find((item) => item.key === key);
    assert(row && row.characters === characters, `${code} ${key} over ${characters}`);
  });
}

function testFileAdapterAndLearned() {
  const { checkDesignFile, pseudoText } = require('../lib/file-adapter');
  const checker = require('../lib/checker');
  const sample = path.join(
    lib.findRepoRoot(),
    'tools/designer-language-toggle/samples/kalshi-predict.csv',
  );
  const limits = lib.loadLimits(lib.defaultLimitsPath());
  const result = checkDesignFile(sample, {
    lang: 'ja',
    limits,
    pseudo: true,
    learned: {
      corrections: [
        {
          lang: 'ja',
          key: 'predict.trade.yes',
          rejected_text: 'Yes',
          preferred_text: 'はい',
          reason: 'example',
          reviewer: 'test',
          date: '2026-11-06',
        },
      ],
      neverTranslate: [],
      preferredPhrasing: [],
    },
  });
  assert(result.kept.length === 3, `kept ${result.kept.length}`);
  assert(result.skipped.length === 2, `skipped ${result.skipped.length}`);
  assert(result.report.missing.length === 3, 'file adapter does not invent Japanese');
  const fixture = path.join(
    lib.findRepoRoot(),
    'tools/designer-language-toggle/samples/design-stage-fixture.json',
  );
  const grouped = checkDesignFile(fixture, { lang: 'de', limits, pseudo: false });
  assert(grouped.rowsRead === 7, `fixture rows ${grouped.rowsRead}`);
  assert(grouped.skipped.length === 3, `fixture skipped ${grouped.skipped.length}`);
  assert(grouped.unique === 3, `fixture unique ${grouped.unique}`);
  const go = grouped.lengths.find((row) => row.source === 'Go');
  assert(go && go.occurrences === 2, 'duplicate text is counted once');
  assert(
    go.screens.includes('Light - Day') && go.screens.includes('Dark - Night'),
    'duplicate text keeps both screens',
  );
  assert(go.bucket === 'button' && go.maxCharacters === 10, 'narrow control uses the 10 character limit');
  const body = grouped.lengths.find((row) => row.bucket === 'wrap');
  assert(body && body.status === 'check-wrapping', 'long text is wrap-checked');
  const tight = grouped.lengths.find((row) => row.source === 'Continue');
  assert(tight && tight.status === 'ok' && tight.characters === 8, 'eight characters still fit in 10');
  const pseudo = pseudoText('Yes');
  assert(pseudo.startsWith('⟦') && pseudo.endsWith('⟧'), 'pseudo is bracketed');
  assert(pseudo.includes('·'), 'pseudo is padded');
  assert(
    result.pseudo.note.includes('Not a translation'),
    'pseudo is labeled as not a translation',
  );
  const learnedReport = checker.check(
    [
      {
        key: 'predict.trade.yes',
        source_text: 'Yes',
        translations: { ja: 'Yes' },
      },
    ],
    {
      lang: 'ja',
      limits,
      strict: true,
      learned: {
        corrections: [
          {
            lang: 'ja',
            key: 'predict.trade.yes',
            rejected_text: 'Yes',
            preferred_text: 'はい',
            reason: 'example',
            reviewer: 'test',
            date: '2026-11-06',
          },
        ],
        neverTranslate: [],
        preferredPhrasing: [],
      },
    },
  );
  assert(
    learnedReport.learned.some((row) =>
      row.message.includes('linguists prefer はい over Yes'),
    ),
    'learned correction is flagged',
  );
  const direct = checker.check(
    [
      {
        key: 'sample.one',
        source_text: 'Close',
        translations: { de: 'Schließen' },
      },
    ],
    {
      lang: 'de',
      limits: { shortStringMaxGraphemes: 25, ratio: 1.4, minDelta: 4, minEnglishWidth: 4, keys: {} },
      strict: true,
    },
  );
  assert(direct.tooLong.length === 1, 'checker string set flags a short expansion');
}

function testFigmaAdapter() {
  const figma = require('../lib/figma-adapter');
  const { checkDesignFile } = require('../lib/file-adapter');
  const parsed = figma.parseFigmaUrl(
    'https://www.figma.com/design/FILEKEY/branch/BRANCHKEY/Name?node-id=12-34',
  );
  assert(parsed.fileKey === 'BRANCHKEY', 'branch link uses the branch key');
  assert(parsed.nodeId === '12:34', 'node-id dashes become colons');
  const plain = figma.parseFigmaUrl(
    'https://www.figma.com/design/FILEKEY/Name?node-id=12-34',
  );
  assert(plain.fileKey === 'FILEKEY', 'design link uses the file key');
  assert(!figma.statusMessage(403).includes('secret-token'), '403 message has no token');
  assert(/refused this token/.test(figma.statusMessage(403)), '403 is designer-friendly');
  assert(/rate-limiting/.test(figma.statusMessage(429)), '429 tells the designer to wait');

  const fixturePath = path.join(
    lib.findRepoRoot(),
    'tools/designer-language-toggle/samples/figma-nodes-fixture.json',
  );
  const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const rules = figma.loadRules(
    path.join(lib.findRepoRoot(), 'tools/designer-language-toggle/references/figma-rules.json'),
  );
  const fetchImpl = async (url) => {
    assert(!url.includes('secret-token'), 'token stays out of the URL');
    return { ok: true, status: 200, json: async () => payload };
  };
  return figma.loadTextNodes('FILEKEY', '1:2', 'secret-token', fetchImpl, rules).then((records) => {
    const byText = new Map(records.map((row) => [row.text, row]));
    assert(byText.get('Continue').kind === 'button', 'button label is a button');
    assert(byText.get('Markets').kind === 'title', 'header label is a nav title');
    assert(byText.get('Secret action').visible === false, 'hidden ancestor hides the text');
    assert(byText.get('AB').kind === 'placeholder_or_annotation', 'fallbackText is skipped');
    const symbol = records.find((row) => row.id === '1:11');
    assert(symbol && symbol.kind === 'placeholder_or_annotation', 'SF Symbol is skipped');
    assert(byText.get('$4.50').kind === 'number_or_data', 'price is data');
    assert(byText.get('$9').kind !== 'number_or_data', '[copy] keeps a price');
    const limits = lib.loadLimits(lib.defaultLimitsPath());
    const cache = path.join(lib.findRepoRoot(), 'tools/designer-language-toggle/.cache/figma/test-fixture.json');
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, JSON.stringify(records));
    const checked = checkDesignFile(cache, { lang: 'de', limits, pseudo: false });
    const over = checked.lengths.find((row) => row.source === 'Continue to checkout');
    assert(over && over.status === 'over' && over.bucket === 'button', 'long button is over the 10 character limit');
    assert(!checked.kept.some((row) => row.source_text === 'Secret action'), 'hidden text is not checked');
    assert(!checked.kept.some((row) => row.source_text === '$4.50'), 'price is not checked');
    fs.rmSync(cache, { force: true });
  }).catch((error) => {
    assert(false, error.message);
  });
}

function main() {
  testWidthAndAccent();
  const { root, realI18n } = makeFixture();
  try {
    testAnalyze(root);
    testRuntimeKeys();
    testRealI18nTransform(realI18n);
    testApplyRevert(root, realI18n);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  testPerpsRegression();
  testFileAdapterAndLearned();
  return testFigmaAdapter().then(() => {
  if (failures > 0) {
    console.error(`${failures} failed`);
    process.exit(1);
  }
  console.log('self-test passed');
  });
}

main();
