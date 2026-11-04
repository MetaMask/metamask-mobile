#!/usr/bin/env node
// Assembles .auto/bench/workload.js from:
//   - bench/lib/deps.js       (inlined dependency copies — frozen)
//   - bench/lib/fixtures.js   (fixtures + runner + self-check — frozen)
//   - bench/original-module.js  (transpiled production file @ baseline — frozen)
//   - bench/candidate-module.js (the experiment surface — edited by the loop)
// Run via measure.sh before each hermes invocation.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');

let scaleCfg = { scale: 1, iters: 20 };
if (fs.existsSync(path.join(here, 'scale.json'))) {
  scaleCfg = { ...scaleCfg, ...JSON.parse(read('scale.json')) };
}

const deps = read('lib/deps.js');
const fixtures = read('lib/fixtures.js');
let original = read('original-module.js');
let candidate = read('candidate-module.js');

const strip = (src) =>
  src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/createDeepEqualSelector/g, 'makeDirect')
    .trim();

original = strip(original);
candidate = strip(candidate);

const RETURNED =
  [
    'getAccountTrackerControllerAccountsByChainId',
    'getTokensControllerAllTokens',
    'getTokensControllerAllIgnoredTokens',
    'getTokenBalancesControllerTokenBalances',
    'getMultiChainAssetsControllerAccountsAssets',
    'getMultiChainAssetsControllerAssetsMetadata',
    'getMultiChainAssetsControllerAllIgnoredAssets',
    'getMultiChainBalancesControllerBalances',
    'getCurrencyRateControllerCurrentCurrency',
    'getCurrencyRateControllerCurrencyRates',
    'getTokenRatesControllerMarketData',
    'getMultichainAssetsRatesControllerConversionRates',
  ].join(', ');

const template = read('workload.template.js');
const SELECTED_QUOTED = [
  'getAccountTrackerControllerAccountsByChainId',
  'getTokensControllerAllTokens',
  'getTokensControllerAllIgnoredTokens',
  'getTokenBalancesControllerTokenBalances',
  'getMultiChainAssetsControllerAccountsAssets',
  'getMultiChainAssetsControllerAssetsMetadata',
  'getMultiChainAssetsControllerAllIgnoredAssets',
  'getMultiChainBalancesControllerBalances',
  'getCurrencyRateControllerCurrentCurrency',
  'getCurrencyRateControllerCurrencyRates',
  'getTokenRatesControllerMarketData',
  'getMultichainAssetsRatesControllerConversionRates',
]
  .map((n) => `"${n}"`)
  .join(', ');
const out = template
  .replace('/*__DEPS__*/', deps)
  .replace('/*__FIXTURES__*/', fixtures)
  .replace('/*__ORIGINAL_MODULE__*/', original)
  .replace('/*__CANDIDATE_MODULE__*/', candidate)
  .replaceAll('__SELECTORS__', SELECTED_QUOTED)
  .replaceAll('__RETURNED__', RETURNED)
  .replaceAll('__SCALE__', String(scaleCfg.scale))
  .replaceAll('__ITERS__', String(scaleCfg.iters));

fs.writeFileSync(path.join(here, 'workload.js'), out);
console.log('assembled workload.js:', (out.length / 1024).toFixed(1), 'KiB');
