/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-namespace */
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Mismatch {
  key: string;
  expected: unknown;
  received: unknown;
}

export interface FixtureSchemaDiff {
  newKeys: string[];
  missingKeys: string[];
  typeMismatches: Mismatch[];
  valueMismatches: Mismatch[];
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Flattens a nested object into a map of dot-paths to type strings.
 * For arrays, only the first element (index 0) is processed — that's
 * sufficient for schema comparison since all elements share the same shape.
 */
function createTypeMap(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const key of Object.keys(obj)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value === null) {
      map[dotPath] = 'null';
    } else if (Array.isArray(value)) {
      map[dotPath] = 'array';
      if (value.length > 0) {
        const first = value[0];
        const itemPath = `${dotPath}.0`;
        if (first === null) {
          map[itemPath] = 'null';
        } else if (Array.isArray(first)) {
          map[itemPath] = 'array';
        } else if (typeof first === 'object') {
          map[itemPath] = 'object';
          Object.assign(
            map,
            createTypeMap(first as Record<string, unknown>, itemPath),
          );
        } else {
          map[itemPath] = typeof first;
        }
      }
    } else if (typeof value === 'object') {
      map[dotPath] = 'object';
      Object.assign(
        map,
        createTypeMap(value as Record<string, unknown>, dotPath),
      );
    } else {
      map[dotPath] = typeof value;
    }
  }

  return map;
}

function isIgnoredKey(key: string, ignoredKeys: string[]): boolean {
  for (const pattern of ignoredKeys) {
    if (!pattern.includes('*')) {
      if (key === pattern || key.startsWith(`${pattern}.`)) {
        return true;
      }
    } else {
      const patternSegments = pattern.split('.');
      const keySegments = key.split('.');

      if (keySegments.length < patternSegments.length) continue;

      let matches = true;
      for (let i = 0; i < patternSegments.length; i++) {
        if (patternSegments[i] === '*') continue;
        if (patternSegments[i] !== keySegments[i]) {
          matches = false;
          break;
        }
      }

      if (matches) return true;
    }
  }
  return false;
}

function getNestedValue(
  obj: Record<string, unknown>,
  dotPath: string,
): unknown {
  const segments = dotPath.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function setNestedValue(
  obj: Record<string, unknown>,
  dotPath: string,
  value: unknown,
): void {
  const segments = dotPath.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (
      current[segment] === undefined ||
      current[segment] === null ||
      typeof current[segment] !== 'object'
    ) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function deleteNestedValue(
  obj: Record<string, unknown>,
  dotPath: string,
): void {
  const segments = dotPath.split('.');
  let current: unknown = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return;
    }
    current = (current as Record<string, unknown>)[segments[i]];
  }

  if (
    current !== null &&
    current !== undefined &&
    typeof current === 'object'
  ) {
    const lastSegment = segments[segments.length - 1];
    if (Array.isArray(current)) {
      const index = Number(lastSegment);
      if (!Number.isNaN(index)) {
        current.splice(index, 1);
      }
    } else {
      delete (current as Record<string, unknown>)[lastSegment];
    }
  }
}

// ─── Exported Functions ──────────────────────────────────────────────────────

export function sortObjectKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeysDeep(item));
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeysDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function getMobileFixtureIgnoredKeys(): string[] {
  return [
    // ── Snap-related (loaded from bundles at runtime, not fixture state) ──
    'engine.backgroundState.SnapController',
    'engine.backgroundState.SnapInterfaceController',
    'engine.backgroundState.SnapsRegistry',
    'engine.backgroundState.SubjectMetadataController',

    // ── Per-wallet secrets and dynamic IDs (change every onboarding) ──
    'engine.backgroundState.AccountsController.internalAccounts.selectedAccount',
    'engine.backgroundState.AccountsController.internalAccounts.accounts',
    'engine.backgroundState.AccountsController.internalAccounts.accounts.*.metadata.importTime',
    'engine.backgroundState.PreferencesController.selectedAddress',
    'engine.backgroundState.PreferencesController.identities',
    'engine.backgroundState.PreferencesController.identities.*.importTime',
    'engine.backgroundState.AccountTrackerController.accountsByChainId',
    'engine.backgroundState.KeyringController.keyrings',
    'engine.backgroundState.KeyringController.vault',
    'engine.backgroundState.KeyringController.isUnlocked',
    'engine.backgroundState.KeyringController.encryptionKey',
    'engine.backgroundState.KeyringController.encryptionSalt',
    'engine.backgroundState.AccountTreeController.accountTree.wallets',
    'engine.backgroundState.AccountTreeController.accountTree.selectedAccountGroup',
    'engine.backgroundState.AccountTreeController.accountGroupsMetadata',
    'engine.backgroundState.AccountTreeController.accountWalletsMetadata',
    'engine.backgroundState.TokenBalancesController.tokenBalances',
    'engine.backgroundState.DeFiPositionsController.allDeFiPositions',
    'engine.backgroundState.DeFiPositionsController.allDeFiPositionsCount',
    'engine.backgroundState.MultichainNetworkController.networksWithTransactionActivity',
    'engine.backgroundState.RewardsController.activeAccount',
    'engine.backgroundState.RewardsController.accounts',
    'browser.activeTab',

    // ── Random IDs (generated fresh each onboarding) ──
    'engine.backgroundState.AnalyticsController.analyticsId',
    'engine.backgroundState.PerpsController.cachedUserDataAddress',

    // ── Timestamps (non-deterministic) ──
    'engine.backgroundState.CurrencyRateController.currencyRates.ETH.conversionDate',
    'engine.backgroundState.PhishingController.hotlistLastFetched',
    'engine.backgroundState.PhishingController.stalelistLastFetched',
    'engine.backgroundState.PhishingController.c2DomainBlocklistLastFetched',
    'engine.backgroundState.PerpsController.lastUpdateTimestamp',
    'engine.backgroundState.PerpsController.cachedMarketDataTimestamp',
    'engine.backgroundState.PerpsController.cachedUserDataTimestamp',
    'legalNotices.newPrivacyPolicyToastShownDate',
    'engine.backgroundState.RemoteFeatureFlagController.cacheTimestamp',
    'engine.backgroundState.EarnController.lastUpdated',
    'cronjobController.storage.events.*.date',
    'cronjobController.storage.events.*.scheduledAt',

    // ── Live-fetched server data (changes every run) ──
    'engine.backgroundState.CurrencyRateController.currencyRates',
    'engine.backgroundState.MultichainAssetsRatesController.conversionRates',
    'engine.backgroundState.MultichainAssetsRatesController.historicalPrices',
    'engine.backgroundState.PhishingController.listState',
    'engine.backgroundState.PhishingController.phishingLists',
    'engine.backgroundState.PhishingController.urlScanCache',
    'engine.backgroundState.PhishingController.tokenScanCache',
    'engine.backgroundState.PhishingController.addressScanCache',
    'engine.backgroundState.PhishingController.whitelistPaths',
    'engine.backgroundState.RemoteFeatureFlagController.rawRemoteFeatureFlags',
    'engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags',
    'engine.backgroundState.RemoteFeatureFlagController.thresholdCache',
    'engine.backgroundState.TokenListController.tokensChainsCache',
    'engine.backgroundState.TokenRatesController.marketData',
    'engine.backgroundState.TokenSearchDiscoveryDataController',

    // ── Multichain runtime state (address-keyed, fetched live) ──
    'engine.backgroundState.MultichainAssetsController.accountsAssets',
    'engine.backgroundState.MultichainAssetsController.assetsMetadata',
    'engine.backgroundState.MultichainAssetsController.allIgnoredAssets',
    'engine.backgroundState.MultichainBalancesController',
    'engine.backgroundState.MultichainTransactionsController',

    // ── Runtime sync/metrics state ──
    'engine.backgroundState.ProfileMetricsController',
    'engine.backgroundState.UserStorageController',
    'engine.backgroundState.AuthenticationController',

    // ── Transaction runtime state ──
    'engine.backgroundState.TransactionController.transactions',
    'engine.backgroundState.TransactionController.transactionBatches',
    'engine.backgroundState.TransactionController.lastFetchedBlockNumbers',
    'engine.backgroundState.TransactionController.submitHistory',
    'engine.backgroundState.TransactionPayController',

    // ── Session-based state ──
    'engine.backgroundState.PermissionController.subjects',
    'engine.backgroundState.SelectedNetworkController.domains',
    'engine.backgroundState.SmartTransactionsController.smartTransactionsState',
    'engine.backgroundState.NotificationServicesController.metamaskNotificationsList',
    'engine.backgroundState.NotificationServicesController.subscriptionAccountsSeen',
    'engine.backgroundState.NotificationServicesPushController',

    // ── Cron jobs and ramps (runtime-populated) ──
    'engine.backgroundState.CronJobController',
    'engine.backgroundState.CronjobController',
    'engine.backgroundState.RampsController',
    'cronjobController',

    // ── Runtime-detected values (non-deterministic between environments) ──
    'card.geoLocation',

    // ── Dynamic network client IDs and port-dependent URLs ──
    'engine.backgroundState.NetworkController.networkConfigurationsByChainId.*.rpcEndpoints.*.networkClientId',
    'engine.backgroundState.NetworkController.networkConfigurationsByChainId.*.rpcEndpoints.*.url',
    'engine.backgroundState.NetworkController.networksMetadata',
    'browser.tabs',

    // ── Post-onboarding runtime UI state (non-deterministic between runs) ──
    'legalNotices.isPna25Acknowledged',
    'modals.shouldNetworkSwitchPopToWallet',
    'user.seedphraseBackedUp',
    'user.backUpSeedphraseVisible',
    'user.multichainAccountsIntroModalSeen',
    'swaps.hasOnboarded',
    'navigation.currentRoute',
    'inpageProvider.networkId',
    'engine.backgroundState.SwapsController.pollingCyclesLeft',

    // ── Redux-persist internals ──
    '_persist',
  ];
}

/**
 * Keys whose value mismatches should be auto-merged during fixture export.
 * Normally only structural changes (new/missing keys, type mismatches) are
 * merged. These keys contain data that is expected to evolve over time
 * (e.g. supported network lists) and should be kept current.
 */
export function getAutoUpdatableKeys(): string[] {
  return ['fiatOrders.networks'];
}

export function computeSchemaDiff(
  baseline: Record<string, unknown>,
  candidate: Record<string, unknown>,
  ignoredKeys?: string[],
): FixtureSchemaDiff {
  const keysToIgnore = ignoredKeys ?? getMobileFixtureIgnoredKeys();
  const baselineTypes = createTypeMap(baseline);
  const candidateTypes = createTypeMap(candidate);

  const diff: FixtureSchemaDiff = {
    newKeys: [],
    missingKeys: [],
    typeMismatches: [],
    valueMismatches: [],
  };

  for (const key of Object.keys(candidateTypes)) {
    if (isIgnoredKey(key, keysToIgnore)) continue;

    if (!(key in baselineTypes)) {
      diff.newKeys.push(key);
      continue;
    }

    if (baselineTypes[key] !== candidateTypes[key]) {
      diff.typeMismatches.push({
        key,
        expected: baselineTypes[key],
        received: candidateTypes[key],
      });
    } else if (candidateTypes[key] === 'array') {
      const baseArr = getNestedValue(baseline, key);
      const candArr = getNestedValue(candidate, key);
      if (
        JSON.stringify(sortObjectKeysDeep(baseArr)) !==
        JSON.stringify(sortObjectKeysDeep(candArr))
      ) {
        diff.valueMismatches.push({
          key,
          expected: baseArr,
          received: candArr,
        });
      }
    } else if (candidateTypes[key] !== 'object') {
      const baseVal = getNestedValue(baseline, key);
      const candVal = getNestedValue(candidate, key);
      if (baseVal !== candVal) {
        diff.valueMismatches.push({
          key,
          expected: baseVal,
          received: candVal,
        });
      }
    }
  }

  for (const key of Object.keys(baselineTypes)) {
    if (isIgnoredKey(key, keysToIgnore)) continue;

    if (!(key in candidateTypes)) {
      diff.missingKeys.push(key);
    }
  }

  return diff;
}

export function hasSchemaDifferences(diff: FixtureSchemaDiff): boolean {
  return (
    diff.newKeys.length > 0 ||
    diff.missingKeys.length > 0 ||
    diff.typeMismatches.length > 0 ||
    diff.valueMismatches.length > 0
  );
}

export function mergeFixtureChanges(
  existing: Record<string, unknown>,
  newState: Record<string, unknown>,
  diff: FixtureSchemaDiff,
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(existing)) as Record<
    string,
    unknown
  >;

  for (const key of diff.newKeys) {
    setNestedValue(result, key, getNestedValue(newState, key));
  }

  // Sort missing keys so array indices are deleted highest-first,
  // preventing splice from shifting later indices.
  const sortedMissing = [...diff.missingKeys].sort((a, b) => {
    const aParts = a.split('.');
    const bParts = b.split('.');
    // Group by parent path, then sort numeric last-segments descending
    const aParent = aParts.slice(0, -1).join('.');
    const bParent = bParts.slice(0, -1).join('.');
    if (aParent !== bParent) return a.localeCompare(b);
    const aIdx = Number(aParts[aParts.length - 1]);
    const bIdx = Number(bParts[bParts.length - 1]);
    if (!Number.isNaN(aIdx) && !Number.isNaN(bIdx)) return bIdx - aIdx;
    return a.localeCompare(b);
  });
  for (const key of sortedMissing) {
    deleteNestedValue(result, key);
  }

  for (const { key } of diff.typeMismatches) {
    setNestedValue(result, key, getNestedValue(newState, key));
  }

  for (const { key } of diff.valueMismatches) {
    setNestedValue(result, key, getNestedValue(newState, key));
  }

  return sortObjectKeysDeep(result) as Record<string, unknown>;
}

export function formatSchemaDiff(diff: FixtureSchemaDiff): string {
  const lines: string[] = [];
  const separator = '─'.repeat(60);

  if (diff.newKeys.length > 0) {
    lines.push(separator);
    lines.push('New keys (present in app state, missing from fixture):');
    lines.push(separator);
    for (const key of diff.newKeys) {
      lines.push(`  + ${key}`);
    }
    lines.push('');
  }

  if (diff.missingKeys.length > 0) {
    lines.push(separator);
    lines.push('Missing keys (present in fixture, missing from app state):');
    lines.push(separator);
    for (const key of diff.missingKeys) {
      lines.push(`  - ${key}`);
    }
    lines.push('');
  }

  if (diff.typeMismatches.length > 0) {
    lines.push(separator);
    lines.push('Type mismatches:');
    lines.push(separator);
    for (const { key, expected, received } of diff.typeMismatches) {
      lines.push(`  ~ ${key}: expected "${expected}", received "${received}"`);
    }
    lines.push('');
  }

  if (diff.valueMismatches.length > 0) {
    lines.push(separator);
    lines.push('Value mismatches:');
    lines.push(separator);
    for (const { key, expected, received } of diff.valueMismatches) {
      lines.push(
        `  ~ ${key}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(received)}`,
      );
    }
    lines.push('');
  }

  if (hasSchemaDifferences(diff)) {
    lines.push(separator);
    lines.push('To update the fixture, run the fixture update command or');
    lines.push(
      'use mergeFixtureChanges() to apply these changes programmatically.',
    );
    lines.push(separator);
  }

  return lines.join('\n');
}

export function readFixtureFile(fixtureName: string): Record<string, unknown> {
  const fixturePath = path.resolve(__dirname, 'json', fixtureName);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
}

/**
 * Normalizes the exported app state (from CommandQueueServer) into the same
 * shape as fixture JSON's `state` subtree so they can be compared.
 *
 * Exported:  { redux: { alert, browser, ... }, engine: { AccountTrackerController, ... } }
 * Fixture:   { state: { alert, browser, ..., engine: { backgroundState: { AccountTrackerController, ... } } } }
 */
export function normalizeExportedState(
  exported: Record<string, unknown>,
): Record<string, unknown> {
  const redux = exported.redux as Record<string, unknown>;
  const engine = exported.engine as Record<string, unknown>;
  return {
    ...redux,
    engine: {
      backgroundState: engine,
    },
  };
}
