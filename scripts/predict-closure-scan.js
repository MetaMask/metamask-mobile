#!/usr/bin/env node
/* eslint-disable import-x/no-commonjs, no-console */
// PRED-1394 structural scans for the Predict dual-stack closure. Prints, for
// tracked files outside `app/components/UI/Predict/` and
// `app/components/UI/PredictNext/`:
//
//   1. imports of Predict modules, split into entry point, composition
//      allowlist, burn-down list and anything else;
//   2. legacy Predict route names;
//   3. Predict controller and service messenger names;
//   4. `TransactionType.predict*` enums.
//
// It is text search: it finds what the code names, not what runs. See
// app/components/UI/PredictNext/docs/composition-allowlist.md for what each
// scan proves and the runtime evidence that covers the rest.
//
// Usage: node scripts/predict-closure-scan.js [--json]

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  predictCompositionFiles,
  predictImportBurndownFiles,
} = require('./eslint-predict-boundary-zones');

const REPO_ROOT = path.join(__dirname, '..');
const PREDICT_TREES = /^app\/components\/UI\/Predict(Next)?\//;
const TEST_FILE = /\.(test|view\.test|integration\.test)\.[jt]sx?$|\/__mocks__\//;
const SOURCE = /\.[cm]?[jt]sx?$/;

const trackedFiles = execFileSync('git', ['ls-files', 'app', 'tests'], {
  cwd: REPO_ROOT,
  maxBuffer: 64 * 1024 * 1024,
})
  .toString()
  .split('\n')
  .filter((file) => SOURCE.test(file) && !PREDICT_TREES.test(file));

const read = (file) => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

// Module specifiers in import, export, require, import() and jest.mock.
const SPECIFIER =
  /(?:\bfrom\s*|\brequire\(\s*|\bimport\(\s*|\bjest\.(?:mock|requireActual|requireMock|doMock)\(\s*|^\s*import\s+)['"`]([^'"`\n]+)['"`]/gm;
const PREDICT_TARGET = /^app\/components\/UI\/Predict(Next)?(\/|$)/;
const ENTRY_POINT = /^app\/components\/UI\/PredictNext(\/index(\.ts)?)?$/;

/** Repo-relative path a relative specifier points at, or null. */
const resolveSpecifier = (file, specifier) =>
  specifier.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))
    : null;

const composition = new Set(predictCompositionFiles);
const burndown = new Set(predictImportBurndownFiles);

const imports = {
  entryPointOnly: [],
  composition: [],
  burndown: [],
  testOnly: [],
  production: [],
};
const routes = [];
const messengers = [];
const enums = {};

const ROUTE = /Routes\.PREDICT\.[A-Z_.]+/g;
const MESSENGER =
  /['"`](Predict(?:Controller|VenueController|MarketDataService|LiveDataService|PortfolioService|OrderService|DeviceAuthService):[A-Za-z]+)['"`]/g;
const ENUM = /TransactionType\.(predict[A-Za-z]+)/g;

for (const file of trackedFiles) {
  const source = read(file);
  const isTest = TEST_FILE.test(file) || file.startsWith('tests/');

  const specifiers = [...source.matchAll(SPECIFIER)]
    .map(([, s]) => resolveSpecifier(file, s))
    .filter((target) => target && PREDICT_TARGET.test(target));
  if (specifiers.length > 0) {
    const internal = specifiers.filter((s) => !ENTRY_POINT.test(s));
    if (composition.has(file)) imports.composition.push(file);
    else if (burndown.has(file)) imports.burndown.push(file);
    else if (internal.length === 0) imports.entryPointOnly.push(file);
    else if (isTest) imports.testOnly.push(file);
    else imports.production.push({ file, internal: [...new Set(internal)] });
  }

  if (!isTest) {
    const fileRoutes = [...new Set(source.match(ROUTE) ?? [])];
    if (fileRoutes.length > 0) routes.push({ file, routes: fileRoutes });

    const fileMessengers = [
      ...new Set([...source.matchAll(MESSENGER)].map(([, m]) => m)),
    ];
    if (fileMessengers.length > 0) {
      messengers.push({
        file,
        composition: composition.has(file),
        actions: fileMessengers,
      });
    }

    for (const [, type] of source.matchAll(ENUM)) {
      enums[type] ??= new Set();
      enums[type].add(file);
    }
  }
}

const report = {
  imports: {
    entryPointOnly: imports.entryPointOnly.length,
    composition: imports.composition.length,
    burndown: imports.burndown.length,
    testOnly: imports.testOnly,
    productionOutsideAllowlist: imports.production,
  },
  routes,
  messengers,
  transactionEnums: Object.fromEntries(
    Object.entries(enums).map(([type, files]) => [type, [...files].sort()]),
  ),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const { imports: i } = report;
  console.log('1. Imports of Predict modules outside Predict');
  console.log(`   entry point only:            ${i.entryPointOnly}`);
  console.log(`   composition allowlist:       ${i.composition}`);
  console.log(`   burn-down list:              ${i.burndown}`);
  console.log(`   tests and test support:      ${i.testOnly.length}`);
  console.log(
    `   production, outside lists:   ${i.productionOutsideAllowlist.length}`,
  );
  i.productionOutsideAllowlist.forEach(({ file, internal }) =>
    console.log(`     ${file} -> ${internal.join(', ')}`),
  );
  console.log('\n2. Legacy Predict route names (non-test)');
  routes.forEach(({ file, routes: r }) =>
    console.log(`   ${file}: ${r.join(', ')}`),
  );
  console.log('\n3. Predict messenger names (non-test)');
  messengers.forEach(({ file, composition: c, actions }) =>
    console.log(`   ${c ? '[composition] ' : ''}${file}: ${actions.join(', ')}`),
  );
  console.log('\n4. TransactionType.predict* (non-test)');
  Object.entries(report.transactionEnums).forEach(([type, files]) =>
    console.log(`   ${type}: ${files.length} files`),
  );
}

process.exitCode = imports.production.length > 0 ? 1 : 0;
