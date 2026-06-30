#!/usr/bin/env node
/**
 * Scan files for React Compiler CompileError / CompileSkip events.
 *
 * Usage:
 *   yarn scan:react-compiler                          # default TMCU-866 epic file list
 *   yarn scan:react-compiler -- app/components/Foo   # explicit paths (files or dirs)
 *
 * Set REACT_COMPILER_LOG_FAILURES=true internally. Writes react-compiler.log (git-ignored).
 * Exits 1 when any scanned file still has compiler failures.
 */

// eslint-disable-next-line import-x/no-commonjs
const babel = require('@babel/core');
// eslint-disable-next-line import-x/no-commonjs
const fs = require('fs');
// eslint-disable-next-line import-x/no-commonjs
const path = require('path');

process.env.REACT_COMPILER_LOG_FAILURES = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const ROOT = path.join(__dirname, '..');
const LOG_PATH = path.join(ROOT, 'react-compiler.log');

/** Default paths from epic TMCU-866 (team-core-ux React Compiler blockers). */
const EPIC_FILES = [
  'app/components/UI/Carousel/StackCardEmpty/StackCardEmpty.tsx',
  'app/components/UI/Carousel/index.tsx',
  'app/components/UI/DeleteWalletModal/index.tsx',
  'app/components/UI/TurnOffRememberMeModal/TurnOffRememberMeModal.tsx',
  'app/components/UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.tsx',
  'app/components/UI/WalletHomeOnboardingSteps/useWalletHomeOnboardingChecklistTradePress.ts',
  'app/components/Views/Homepage/Homepage.tsx',
  'app/components/Views/Homepage/components/HomepageDiscoveryTabs/HomepageDiscoveryTabs.tsx',
  'app/components/Views/Homepage/hooks/useHomeSessionSummary.ts',
  'app/components/Views/Homepage/hooks/useSectionPerformance.ts',
  'app/components/Views/Homepage/hooks/useTabViewedEvent.ts',
  'app/components/Views/Login/index.tsx',
  'app/components/Views/MultichainTransactionsView/MultichainTransactionsView.tsx',
  'app/components/Views/NetworkSelector/NetworkSelector.tsx',
  'app/components/Views/QRScanner/index.tsx',
  'app/components/Views/QRTabSwitcher/QRTabSwitcher.tsx',
  'app/components/Views/Settings/NotificationsSettings/hooks/useNotificationStoragePreferences.ts',
  'app/components/Views/Settings/SecuritySettings/Sections/DeleteMetaMetricsData.tsx',
  'app/components/Views/Settings/SecuritySettings/Sections/DeviceSecurityToggle.tsx',
  'app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx',
  'app/components/Views/UnifiedTransactionsView/useTransactionAutoScroll.ts',
  'app/components/Views/UnifiedTransactionsView/useUnifiedTxActions.ts',
  'app/components/Views/Wallet/hooks/useBalanceRefresh.ts',
  'app/components/Views/Wallet/index.tsx',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const collectSourceFiles = (inputPath) => {
  const abs = path.resolve(ROOT, inputPath);
  if (!fs.existsSync(abs)) {
    return [];
  }
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    return [abs];
  }
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.has(ext)) {
        results.push(full);
      }
    }
  };
  walk(abs);
  return results;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const separator = args.indexOf('--');
  const paths =
    separator >= 0 ? args.slice(separator + 1) : args.length > 0 ? args : EPIC_FILES;
  const files = paths.flatMap((p) => collectSourceFiles(p));
  return [...new Set(files)].sort();
};

const parseLogByFile = () => {
  if (!fs.existsSync(LOG_PATH)) {
    return new Map();
  }
  const log = fs.readFileSync(LOG_PATH, 'utf8');
  const byFile = new Map();
  const blocks = log.split(/(?=\[\d{4}-\d{2}-\d{2}T)/).filter(Boolean);
  for (const block of blocks) {
    const fileMatch = block.match(/File:\s+(.+)/);
    const detailMatch = block.match(/Detail: ([\s\S]*?)(?:\n-{3,}|$)/);
    if (!fileMatch || !detailMatch) continue;
    const rel = fileMatch[1].trim().replace(/.*metamask-mobile\//, '');
    let reason = detailMatch[1].trim();
    try {
      const parsed = JSON.parse(reason);
      reason = parsed?.options?.reason || parsed?.reason || reason;
    } catch {
      // keep raw detail string
    }
    if (!byFile.has(rel)) byFile.set(rel, new Set());
    byFile.get(rel).add(reason);
  }
  return byFile;
};

const main = () => {
  try {
    fs.unlinkSync(LOG_PATH);
  } catch {
    // log may not exist yet
  }

  const files = parseArgs();
  if (files.length === 0) {
    console.error('No source files to scan.');
    process.exit(1);
  }

  const babelConfig = path.join(ROOT, 'babel.config.js');
  let babelErrors = 0;

  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    try {
      babel.transformFileSync(abs, {
        configFile: babelConfig,
        filename: abs,
      });
    } catch (error) {
      babelErrors += 1;
      console.error(`Babel failed: ${rel}: ${error.message}`);
    }
  }

  const failures = parseLogByFile();
  const scannedRel = files.map((f) => path.relative(ROOT, f));

  console.log(`\nReact Compiler scan — ${new Date().toISOString()}`);
  console.log(`Files scanned: ${scannedRel.length}`);
  console.log(`Log: ${path.relative(ROOT, LOG_PATH)}\n`);

  let blocked = 0;
  for (const rel of scannedRel) {
    const reasons = failures.get(rel);
    if (!reasons || reasons.size === 0) {
      console.log(`✅ ${rel}`);
      continue;
    }
    blocked += 1;
    console.log(`❌ ${rel}`);
    for (const reason of reasons) {
      console.log(`   • ${reason}`);
    }
  }

  console.log(`\nSummary: ${blocked} blocked, ${scannedRel.length - blocked} clean`);
  if (babelErrors > 0) {
    console.log(`Babel transform errors: ${babelErrors}`);
  }

  process.exit(blocked > 0 || babelErrors > 0 ? 1 : 0);
};

main();
