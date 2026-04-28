import {
  buildAdapterNamespaces,
  proposalReferencedAdapterNamespaces,
  seedAdapterPermissions,
} from './namespaces';
import type { ChainAdapter, NamespaceConfig } from './types';

jest.mock('./registry', () => ({
  getAllAdapters: jest.fn(),
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

import { getAllAdapters } from './registry';

const mockedGetAllAdapters = getAllAdapters as jest.Mock;

const createFakeAdapter = (
  overrides: Partial<ChainAdapter> = {},
): ChainAdapter => ({
  namespace: overrides.namespace ?? 'fake',
  redirectMethods: overrides.redirectMethods ?? [],
  proposalReferencesNamespace:
    overrides.proposalReferencesNamespace ?? jest.fn().mockReturnValue(false),
  onBeforeApprove: overrides.onBeforeApprove,
  buildNamespace:
    overrides.buildNamespace ?? jest.fn().mockReturnValue(undefined),
  mapRequestForSnap:
    overrides.mapRequestForSnap ??
    jest.fn().mockImplementation(({ method, params }) => ({ method, params })),
  normalizeSnapResponse:
    overrides.normalizeSnapResponse ??
    jest.fn().mockImplementation(({ result }) => result),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('seedAdapterPermissions', () => {
  it('invokes onBeforeApprove for every adapter that declares one', async () => {
    const tronHook = jest.fn();
    const solanaHook = jest.fn();
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: 'tron', onBeforeApprove: tronHook }),
      createFakeAdapter({ namespace: 'solana', onBeforeApprove: solanaHook }),
    ]);

    await seedAdapterPermissions({
      proposal: {
        requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      channelId: 'channel-1',
    });

    expect(tronHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      channelId: 'channel-1',
    });
    expect(solanaHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      channelId: 'channel-1',
    });
  });

  it('skips adapters that do not declare an onBeforeApprove hook', async () => {
    const adapterWithoutHook = createFakeAdapter({ namespace: 'btc' });
    delete adapterWithoutHook.onBeforeApprove;
    mockedGetAllAdapters.mockReturnValue([adapterWithoutHook]);

    await expect(
      seedAdapterPermissions({ proposal: {}, channelId: 'c' }),
    ).resolves.not.toThrow();
  });

  it('continues running other adapters when one onBeforeApprove throws', async () => {
    const failingHook = jest.fn().mockRejectedValue(new Error('boom'));
    const followingHook = jest.fn();
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: 'a', onBeforeApprove: failingHook }),
      createFakeAdapter({ namespace: 'b', onBeforeApprove: followingHook }),
    ]);

    await seedAdapterPermissions({ proposal: {}, channelId: 'channel-2' });

    expect(failingHook).toHaveBeenCalled();
    expect(followingHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      channelId: 'channel-2',
    });
  });
});

describe('buildAdapterNamespaces', () => {
  it('returns an empty object when no adapters are registered', () => {
    mockedGetAllAdapters.mockReturnValue([]);

    const result = buildAdapterNamespaces({ proposal: {} });

    expect(result).toStrictEqual({});
  });

  it('asks every adapter for its slice and aggregates the results by namespace', () => {
    const tronSlice: NamespaceConfig = {
      chains: ['tron:728126428'],
      methods: ['tron_signTransaction'],
      events: [],
      accounts: ['tron:728126428:TAddr'],
    };
    const solanaSlice: NamespaceConfig = {
      chains: ['solana:5eyk'],
      methods: ['solana_signMessage'],
      events: [],
      accounts: ['solana:5eyk:Sol'],
    };
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'tron',
        buildNamespace: jest.fn().mockReturnValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: 'solana',
        buildNamespace: jest.fn().mockReturnValue(solanaSlice),
      }),
    ]);

    const result = buildAdapterNamespaces({ proposal: {} });

    expect(result).toStrictEqual({ tron: tronSlice, solana: solanaSlice });
  });

  it('omits adapters whose buildNamespace returns undefined', () => {
    const tronSlice: NamespaceConfig = {
      chains: ['tron:728126428'],
      methods: [],
      events: [],
      accounts: [],
    };
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'tron',
        buildNamespace: jest.fn().mockReturnValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: 'solana',
        buildNamespace: jest.fn().mockReturnValue(undefined),
      }),
    ]);

    const result = buildAdapterNamespaces({ proposal: {} });

    expect(result).toStrictEqual({ tron: tronSlice });
    expect(result).not.toHaveProperty('solana');
  });

  it('forwards accounts/methods/events from existingNamespaces to each adapter', () => {
    const buildNamespace = jest.fn().mockReturnValue(undefined);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: 'tron', buildNamespace }),
    ]);

    buildAdapterNamespaces({
      proposal: {},
      existingNamespaces: {
        tron: {
          accounts: ['tron:728126428:TExisting'],
          methods: ['tron_signTransaction'],
          events: ['tron_evt'],
        },
      },
    });

    expect(buildNamespace).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      existingAccounts: ['tron:728126428:TExisting'],
      existingMethods: ['tron_signTransaction'],
      existingEvents: ['tron_evt'],
    });
  });

  it('passes undefined existing fields when the namespace has no entry in existingNamespaces', () => {
    const buildNamespace = jest.fn().mockReturnValue(undefined);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: 'tron', buildNamespace }),
    ]);

    buildAdapterNamespaces({ proposal: {}, existingNamespaces: {} });

    expect(buildNamespace).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      existingAccounts: undefined,
      existingMethods: undefined,
      existingEvents: undefined,
    });
  });
});

describe('proposalReferencedAdapterNamespaces', () => {
  it('returns the namespaces of all adapters that recognize the proposal', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'tron',
        proposalReferencesNamespace: jest.fn().mockReturnValue(true),
      }),
      createFakeAdapter({
        namespace: 'solana',
        proposalReferencesNamespace: jest.fn().mockReturnValue(false),
      }),
      createFakeAdapter({
        namespace: 'bitcoin',
        proposalReferencesNamespace: jest.fn().mockReturnValue(true),
      }),
    ]);

    const result = proposalReferencedAdapterNamespaces({});

    expect(result).toStrictEqual(['tron', 'bitcoin']);
  });

  it('returns an empty array when no adapter recognizes the proposal', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'tron',
        proposalReferencesNamespace: jest.fn().mockReturnValue(false),
      }),
    ]);

    const result = proposalReferencedAdapterNamespaces({});

    expect(result).toStrictEqual([]);
  });

  it('returns an empty array when no adapters are registered', () => {
    mockedGetAllAdapters.mockReturnValue([]);

    expect(proposalReferencedAdapterNamespaces({})).toStrictEqual([]);
  });
});
