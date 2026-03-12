jest.mock('prettier', () => ({
  default: {
    format: (content: string) => Promise.resolve(content),
    resolveConfig: () => Promise.resolve(null),
  },
}));

/* eslint-disable import/no-nodejs-modules -- Node.js script for CI/sync */
import fs from 'fs';
import {
  getProductionRemoteFlagApiResponse,
  getProductionRemoteFlagDefaults,
} from './feature-flag-registry';
import {
  compareProductionFlagsToRegistry,
  updateRegistryFile,
} from './sync-production-flags';

// Synthetic registry fixture matching structure required by updateRegistryFile
// Uses 2-space indent for entries to match entryPattern: ^  flagName:
const REGISTRY_FIXTURE = `/**
 * Feature Flag Registry
 * Production defaults last synced: 2020-01-01
 */
export const FEATURE_FLAG_REGISTRY = {
  flagA: {
    name: 'flagA',
    type: 'remote',
    inProd: true,
    productionDefault: true,
    status: 'active',
  },

  flagB: {
    name: 'flagB',
    type: 'remote',
    inProd: false,
    productionDefault: false,
    status: 'active',
  },

  flagToRemove: {
    name: 'flagToRemove',
    type: 'remote',
    inProd: true,
    productionDefault: { nested: 'old' },
    status: 'active',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================
`;

describe('compareProductionFlagsToRegistry', () => {
  it('detects new flags in production not in registry', () => {
    const registryMap = { addSolanaAccount: true };
    const prodResponse = [
      { addSolanaAccount: true },
      { brandNewFlag: { enabled: true } },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toContainEqual({
      name: 'brandNewFlag',
      value: { enabled: true },
    });
    expect(result.hasDrift).toBe(true);
  });

  it('detects value mismatches between registry and production', () => {
    const registryMap = { addSolanaAccount: true, addBitcoinAccount: false };
    const prodResponse = [
      { addSolanaAccount: false },
      { addBitcoinAccount: false },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    const addSolanaMismatch = result.valueMismatches.find(
      (m) => m.name === 'addSolanaAccount',
    );
    expect(addSolanaMismatch).toBeDefined();
    expect(addSolanaMismatch?.productionValue).toBe(false);
    expect(addSolanaMismatch?.registryValue).toBe(true);
    expect(result.hasDrift).toBe(true);
  });

  it('detects flags in registry no longer in production', () => {
    const registryMap = { someRemovedFlag: true };
    const prodResponse: Record<string, unknown>[] = [];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.removedFromProduction).toContainEqual({
      name: 'someRemovedFlag',
      registryValue: true,
    });
    expect(result.hasDrift).toBe(true);
  });

  it('returns hasDrift false when production matches registry', () => {
    const registryMap = getProductionRemoteFlagDefaults() as Record<
      string,
      unknown
    >;
    const prodResponse = getProductionRemoteFlagApiResponse() as Record<
      string,
      unknown
    >[];

    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toHaveLength(0);
    expect(result.removedFromProduction).toHaveLength(0);
    expect(result.valueMismatches).toHaveLength(0);
    expect(result.inProdMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('detects inProd mismatch when flag exists with inProd false but is in production', () => {
    const registryMap: Record<string, unknown> = {};
    const prodResponse = [{ staleInProdFlag: true }];
    const fullRegistryOverride = { staleInProdFlag: { inProd: false } };

    const result = compareProductionFlagsToRegistry(
      prodResponse,
      registryMap,
      fullRegistryOverride,
    );

    expect(result.inProdMismatches).toContainEqual({
      name: 'staleInProdFlag',
      productionValue: true,
    });
    expect(result.newInProduction).toHaveLength(0);
    expect(result.hasDrift).toBe(true);
  });

  it('skips excluded flags (e.g. mobileMinimumVersions)', () => {
    const registryMap = { mobileMinimumVersions: { ios: '1.0.0' } };
    const prodResponse = [{ mobileMinimumVersions: { ios: '7.70.0' } }];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(0);
    expect(result.newInProduction).toHaveLength(0);
    expect(result.removedFromProduction).toHaveLength(0);
    expect(result.inProdMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('parses production API format (array of single-key objects)', () => {
    const registryMap: Record<string, unknown> = {};
    const prodResponse = [
      { flagA: true },
      { flagB: { nested: 'value' } },
      { flagC: [1, 2, 3] },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toContainEqual({
      name: 'flagA',
      value: true,
    });
    expect(result.newInProduction).toContainEqual({
      name: 'flagB',
      value: { nested: 'value' },
    });
    expect(result.newInProduction).toContainEqual({
      name: 'flagC',
      value: [1, 2, 3],
    });
  });
});

describe('updateRegistryFile', () => {
  const originalReadFileSync = fs.readFileSync;
  let readFileSyncMock: jest.SpyInstance;
  let writeFileSyncMock: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    readFileSyncMock = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(
        (path: fs.PathOrFileDescriptor, encoding?: unknown) => {
          if (encoding === 'utf-8') {
            return REGISTRY_FIXTURE;
          }
          return originalReadFileSync.call(
            fs,
            path,
            encoding as BufferEncoding,
          );
        },
      );
    writeFileSyncMock = jest.spyOn(fs, 'writeFileSync').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    readFileSyncMock.mockRestore();
    writeFileSyncMock.mockRestore();
  });

  it('updates productionDefault for value mismatches', async () => {
    const result = {
      newInProduction: [],
      removedFromProduction: [],
      valueMismatches: [
        { name: 'flagA', productionValue: false, registryValue: true },
      ],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).toContain('productionDefault: false');
    expect(written).toMatch(/flagA:\s*\{[^}]*productionDefault:\s*false/);
    expect(written).not.toMatch(/flagA:\s*\{[\s\S]*?productionDefault:\s*true/);
  });

  it('removes entries no longer in production', async () => {
    const result = {
      newInProduction: [],
      removedFromProduction: [
        { name: 'flagToRemove', registryValue: { nested: 'old' } },
      ],
      valueMismatches: [],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).not.toContain('flagToRemove');
    expect(written).toContain('flagA');
  });

  it('adds new flag entries before Helper Functions', async () => {
    const result = {
      newInProduction: [{ name: 'brandNewFlag', value: true }],
      removedFromProduction: [],
      valueMismatches: [],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).toContain('brandNewFlag');
    expect(written).toMatch(/brandNewFlag:\s*\{/);
    expect(written).toContain('type: FeatureFlagType.Remote');
    expect(written).toContain('status: FeatureFlagStatus.Active');
    expect(written).toContain('productionDefault: true');
    expect(written).toContain('inProd: true');
    const helperIdx = written.indexOf('// Helper Functions');
    const newFlagIdx = written.indexOf('brandNewFlag');
    expect(newFlagIdx).toBeLessThan(helperIdx);
  });

  it('flips inProd false to true and updates productionDefault for inProdMismatches', async () => {
    const result = {
      newInProduction: [],
      removedFromProduction: [],
      valueMismatches: [],
      inProdMismatches: [{ name: 'flagB', productionValue: true }],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).toContain('flagB');
    expect(written).toMatch(/flagB:\s*\{[^}]*inProd:\s*true/);
    expect(written).toMatch(/flagB:\s*\{[^}]*productionDefault:\s*true/);
    expect(written).not.toMatch(/flagB:\s*\{[\s\S]*?inProd:\s*false/);
  });

  it('updates the last synced date in the header comment', async () => {
    const result = {
      newInProduction: [],
      removedFromProduction: [],
      valueMismatches: [],
      inProdMismatches: [],
      hasDrift: false,
    };
    await updateRegistryFile(result);
    const today = new Date().toISOString().split('T')[0];
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).toContain(`Production defaults last synced: ${today}`);
    expect(written).not.toContain(
      'Production defaults last synced: 2020-01-01',
    );
  });
});
