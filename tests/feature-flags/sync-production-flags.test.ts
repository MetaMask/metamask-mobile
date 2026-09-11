jest.mock('prettier', () => ({
  default: {
    format: (content: string) => Promise.resolve(content),
    resolveConfig: () => Promise.resolve(null),
  },
}));

/* eslint-disable import-x/no-nodejs-modules -- Node.js script for CI/sync */
import fs from 'fs';
import {
  getProductionRemoteFlagApiResponse,
  getProductionRemoteFlagDefaults,
} from './feature-flag-registry';
import {
  compareProductionFlagsToRegistry,
  findDuplicateRegistryKeys,
  pinScopedVariantsToDefault,
  updateRegistryFile,
  validateRegistryFile,
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
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  flagB: {
    name: 'flagB',
    type: FeatureFlagType.Remote,
    inProd: false,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  flagToRemove: {
    name: 'flagToRemove',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: { nested: 'old' },
    status: FeatureFlagStatus.Active,
  },

  "scriptStyleFlag": {
    name: 'scriptStyleFlag',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 'initial',
    status: FeatureFlagStatus.Active,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================
`;

const createThresholdVariant = (
  name: string,
  scopeValue: number,
  extra: Record<string, unknown> = {},
) => ({
  name,
  scope: { type: 'threshold', value: scopeValue },
  ...extra,
});

describe('pinScopedVariantsToDefault', () => {
  it('pins control to 1 and treatment to 0 for threshold arrays', () => {
    const value = [
      createThresholdVariant('control', 0.95),
      createThresholdVariant('treatment', 1),
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      createThresholdVariant('control', 1),
      createThresholdVariant('treatment', 0),
    ]);
  });

  it('pins named control when treatment is the remainder majority', () => {
    const value = [
      createThresholdVariant('control', 0.2),
      createThresholdVariant('treatment', 1),
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      createThresholdVariant('control', 1),
      createThresholdVariant('treatment', 0),
    ]);
  });

  it('pins control to 1 and treatment to 0 for percentage_rollout arrays', () => {
    const value = [
      {
        name: 'control',
        scope: { type: 'percentage_rollout', value: 0.7 },
      },
      {
        name: 'treatment',
        scope: { type: 'percentage_rollout', value: 1 },
      },
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      {
        name: 'control',
        scope: { type: 'percentage_rollout', value: 1 },
      },
      {
        name: 'treatment',
        scope: { type: 'percentage_rollout', value: 0 },
      },
    ]);
  });

  it('pins control when the variant uses thresholdName', () => {
    const value = [
      {
        thresholdName: 'control',
        scope: { type: 'threshold', value: 0.5 },
      },
      {
        thresholdName: 'treatment',
        scope: { type: 'threshold', value: 1 },
      },
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      {
        thresholdName: 'control',
        scope: { type: 'threshold', value: 1 },
      },
      {
        thresholdName: 'treatment',
        scope: { type: 'threshold', value: 0 },
      },
    ]);
  });

  it('pins the widest rollout bucket when there is no control', () => {
    const value = [
      createThresholdVariant('feature is ON', 0.8, { value: true }),
      createThresholdVariant('feature is OFF', 1, { value: false }),
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      createThresholdVariant('feature is ON', 1, { value: true }),
      createThresholdVariant('feature is OFF', 0, { value: false }),
    ]);
  });

  it('pins the middle bucket when it is the widest and there is no control', () => {
    const value = [
      createThresholdVariant('small', 0.1),
      createThresholdVariant('wide', 0.7),
      createThresholdVariant('remainder', 1),
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      createThresholdVariant('small', 0),
      createThresholdVariant('wide', 1),
      createThresholdVariant('remainder', 0),
    ]);
  });

  it('pins a single variant to 1', () => {
    const value = [
      createThresholdVariant('feature is ON', 0.4, { value: true }),
    ];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([
      createThresholdVariant('feature is ON', 1, { value: true }),
    ]);
  });

  it('returns an empty array unchanged', () => {
    const value: unknown[] = [];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual([]);
  });

  it('returns chain id lists unchanged', () => {
    const value = ['0x1', '0xe708'];

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual(['0x1', '0xe708']);
  });

  it('returns objects and primitives unchanged', () => {
    expect(pinScopedVariantsToDefault(true)).toBe(true);
    expect(pinScopedVariantsToDefault({ enabled: true })).toEqual({
      enabled: true,
    });
  });

  it('pins nested variant arrays under versioned flag values', () => {
    const value = {
      versions: {
        '8.1.0': [
          createThresholdVariant('control', 0),
          createThresholdVariant('treatment', 1),
        ],
      },
    };

    const result = pinScopedVariantsToDefault(value);

    expect(result).toEqual({
      versions: {
        '8.1.0': [
          createThresholdVariant('control', 1),
          createThresholdVariant('treatment', 0),
        ],
      },
    });
  });
});

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

  it('does not skip any flags when EXCLUDED_FLAGS is empty', () => {
    const registryMap = { mobileMinimumVersions: { ios: '1.0.0' } };
    const prodResponse = [{ mobileMinimumVersions: { ios: '7.70.0' } }];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(1);
    expect(result.valueMismatches).toContainEqual({
      name: 'mobileMinimumVersions',
      productionValue: { ios: '7.70.0' },
      registryValue: { ios: '1.0.0' },
    });
    expect(result.newInProduction).toHaveLength(0);
    expect(result.removedFromProduction).toHaveLength(0);
    expect(result.inProdMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(true);
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

  it('does not report drift when production AB weights differ from pinned registry control', () => {
    const pinned = [
      createThresholdVariant('control', 1),
      createThresholdVariant('treatment', 0),
    ];
    const registryMap = { socialAbTest: pinned };
    const prodResponse = [
      {
        socialAbTest: [
          createThresholdVariant('control', 0.95),
          createThresholdVariant('treatment', 1),
        ],
      },
    ];

    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('reports drift when a pinned variant name changes', () => {
    const registryMap = {
      socialAbTest: [
        createThresholdVariant('control', 1),
        createThresholdVariant('treatment', 0),
      ],
    };
    const prodResponse = [
      {
        socialAbTest: [
          createThresholdVariant('control', 0.95),
          createThresholdVariant('treatment-b', 1),
        ],
      },
    ];

    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.hasDrift).toBe(true);
    expect(result.valueMismatches).toContainEqual({
      name: 'socialAbTest',
      productionValue: [
        createThresholdVariant('control', 1),
        createThresholdVariant('treatment-b', 0),
      ],
      registryValue: [
        createThresholdVariant('control', 1),
        createThresholdVariant('treatment', 0),
      ],
    });
  });

  it('reports new production scoped arrays with pinned scopes', () => {
    const registryMap: Record<string, unknown> = {};
    const prodResponse = [
      {
        brandNewAbTest: [
          createThresholdVariant('control', 0.95),
          createThresholdVariant('treatment', 1),
        ],
      },
    ];

    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.newInProduction).toContainEqual({
      name: 'brandNewAbTest',
      value: [
        createThresholdVariant('control', 1),
        createThresholdVariant('treatment', 0),
      ],
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
    const beforeFlagB = written.split(/\n {2}flagB:/u)[0] ?? '';
    expect(beforeFlagB).toMatch(/flagA:\s*\{/u);
    expect(beforeFlagB).toMatch(/productionDefault:\s*false/u);
    expect(beforeFlagB).not.toMatch(/productionDefault:\s*true/u);
  });

  it('updates productionDefault when registry key is script-quoted (JSON.stringify)', async () => {
    const result = {
      newInProduction: [],
      removedFromProduction: [],
      valueMismatches: [
        {
          name: 'scriptStyleFlag',
          productionValue: 'updated',
          registryValue: 'initial',
        },
      ],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    expect(written).toMatch(/"scriptStyleFlag":\s*\{/u);
    const afterQuotedKey = written.split('"scriptStyleFlag":')[1] ?? '';
    expect(afterQuotedKey).toMatch(/productionDefault:\s*"updated"/u);
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
    expect(written).toMatch(/"brandNewFlag":\s*\{/u);
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
    const flagBBlock = (written.split(/\n {2}flagB:/u)[1] ?? '').split(
      /\n {2}flagToRemove:/u,
    )[0];
    expect(flagBBlock).toMatch(/inProd:\s*true/u);
    expect(flagBBlock).toMatch(/productionDefault:\s*true/u);
    expect(flagBBlock).not.toMatch(/inProd:\s*false/u);
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

  it('skips appending a new flag that already exists in the registry', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = {
      newInProduction: [{ name: 'flagA', value: { updated: true } }],
      removedFromProduction: [],
      valueMismatches: [],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    const matches = written.match(/flagA:\s*\{/gu) ?? [];
    expect(matches).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping duplicate: "flagA"'),
    );
    consoleSpy.mockRestore();
  });

  it('serializes object values with sorted keys for deterministic output', async () => {
    const result = {
      newInProduction: [
        { name: 'sortedFlag', value: { zebra: 1, alpha: 2, middle: 3 } },
      ],
      removedFromProduction: [],
      valueMismatches: [],
      inProdMismatches: [],
      hasDrift: true,
    };
    await updateRegistryFile(result);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const written = writeFileSyncMock.mock.calls[0][1] as string;
    const alphaIdx = written.indexOf('"alpha"');
    const middleIdx = written.indexOf('"middle"');
    const zebraIdx = written.indexOf('"zebra"');
    expect(alphaIdx).toBeLessThan(middleIdx);
    expect(middleIdx).toBeLessThan(zebraIdx);
  });
});

describe('findDuplicateRegistryKeys', () => {
  it('returns empty array when no duplicates exist', () => {
    const content = `
  flagA: {
    name: 'flagA',
  },
  flagB: {
    name: 'flagB',
  },
`;
    expect(findDuplicateRegistryKeys(content)).toHaveLength(0);
  });

  it('detects duplicate unquoted keys', () => {
    const content = `
  flagA: {
    name: 'flagA',
  },
  flagB: {
    name: 'flagB',
  },
  flagA: {
    name: 'flagA',
  },
`;
    const dupes = findDuplicateRegistryKeys(content);
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain('flagA');
  });

  it('detects duplicate quoted keys', () => {
    const content = `
  "myFlag": {
    name: 'myFlag',
  },
  "myFlag": {
    name: 'myFlag',
  },
`;
    const dupes = findDuplicateRegistryKeys(content);
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain('myFlag');
  });
});

describe('validateRegistryFile', () => {
  it('returns empty array for valid content with no duplicates', () => {
    const content = `
  flagA: {
    name: 'flagA',
  },
  flagB: {
    name: 'flagB',
  },
`;
    expect(validateRegistryFile(content)).toHaveLength(0);
  });

  it('returns duplicate key errors', () => {
    const content = `
  flagA: {
    name: 'flagA',
  },
  flagA: {
    name: 'flagA',
  },
`;
    const errors = validateRegistryFile(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('flagA');
  });
});

describe('compareProductionFlagsToRegistry - key ordering', () => {
  it('does not flag reordered object keys as drift', () => {
    const registryMap = { myFlag: { alpha: 1, zebra: 2 } };
    const prodResponse = [{ myFlag: { zebra: 2, alpha: 1 } }];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('does not flag deeply nested reordered keys as drift', () => {
    const registryMap = {
      myFlag: {
        versions: {
          '1.0.0': { alpha: true, beta: false },
        },
      },
    };
    const prodResponse = [
      {
        myFlag: {
          versions: {
            '1.0.0': { beta: false, alpha: true },
          },
        },
      },
    ];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('still detects actual value changes even with different key order', () => {
    const registryMap = { myFlag: { alpha: 1, zebra: 2 } };
    const prodResponse = [{ myFlag: { zebra: 999, alpha: 1 } }];
    const result = compareProductionFlagsToRegistry(prodResponse, registryMap);

    expect(result.valueMismatches).toHaveLength(1);
    expect(result.hasDrift).toBe(true);
  });
});
