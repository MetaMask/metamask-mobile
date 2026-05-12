import { type CaipChainId, KnownCaipNamespace } from '@metamask/utils';
import {
  buildAdapterNamespaces,
  proposalReferencedAdapterNamespaces,
  seedAdapterPermissions,
} from './helpers';
import type { ChainAdapter, NamespaceConfig } from './types';
import {
  getRedirectMethodsForChain,
  mapRequestForSnap,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeSnapResponse,
} from './index';
import { getAdapter, getAllAdapters } from './registry';

jest.mock('./registry', () => ({
  getAdapter: jest.fn(),
  getAllAdapters: jest.fn().mockReturnValue([]),
  getAllRegisteredNamespaces: jest.fn().mockReturnValue([]),
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.Mock;

const mockedGetAllAdapters = getAllAdapters as jest.Mock;

const createFakeAdapter = (
  overrides: Partial<ChainAdapter> = {},
): ChainAdapter => ({
  namespace: (overrides.namespace ?? 'fake') as KnownCaipNamespace,
  redirectMethods: overrides.redirectMethods ?? [],
  proposalReferencesNamespace:
    overrides.proposalReferencesNamespace ?? jest.fn().mockReturnValue(false),
  onBeforeApprove: overrides.onBeforeApprove,
  buildNamespace:
    overrides.buildNamespace ?? jest.fn().mockReturnValue(undefined),
  mapRequestInbound:
    overrides.mapRequestInbound ??
    jest.fn().mockImplementation(({ method, params }) => ({ method, params })),
  mapRequestOutbound:
    overrides.mapRequestOutbound ??
    jest.fn().mockImplementation(({ result }) => result),
  buildScopedPermissionsNamespace:
    overrides.buildScopedPermissionsNamespace ??
    jest.fn().mockReturnValue(undefined),
  normalizeCaipChainIdInbound:
    overrides.normalizeCaipChainIdInbound ??
    jest.fn().mockImplementation((caipChainId: CaipChainId) => caipChainId),
  normalizeCaipChainIdOutbound:
    overrides.normalizeCaipChainIdOutbound ??
    jest.fn().mockImplementation((caipChainId: CaipChainId) => caipChainId),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('seedAdapterPermissions', () => {
  it('invokes onBeforeApprove for every adapter that declares one', async () => {
    const tronHook = jest.fn();
    const solanaHook = jest.fn();
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        onBeforeApprove: tronHook,
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        onBeforeApprove: solanaHook,
      }),
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
    const adapterWithoutHook = createFakeAdapter({
      namespace: KnownCaipNamespace.Bip122,
    });
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
      createFakeAdapter({
        namespace: 'a' as KnownCaipNamespace,
        onBeforeApprove: failingHook,
      }),
      createFakeAdapter({
        namespace: 'b' as KnownCaipNamespace,
        onBeforeApprove: followingHook,
      }),
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
        namespace: KnownCaipNamespace.Tron,
        buildNamespace: jest.fn().mockReturnValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
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
        namespace: KnownCaipNamespace.Tron,
        buildNamespace: jest.fn().mockReturnValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        buildNamespace: jest.fn().mockReturnValue(undefined),
      }),
    ]);

    const result = buildAdapterNamespaces({ proposal: {} });

    expect(result).toStrictEqual({ tron: tronSlice });
    expect(result).not.toHaveProperty(KnownCaipNamespace.Solana);
  });

  it('forwards accounts/methods/events from existingNamespaces to each adapter', () => {
    const buildNamespace = jest.fn().mockReturnValue(undefined);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: KnownCaipNamespace.Tron, buildNamespace }),
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
      createFakeAdapter({ namespace: KnownCaipNamespace.Tron, buildNamespace }),
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
        namespace: KnownCaipNamespace.Tron,
        proposalReferencesNamespace: jest.fn().mockReturnValue(true),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        proposalReferencesNamespace: jest.fn().mockReturnValue(false),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Bip122,
        proposalReferencesNamespace: jest.fn().mockReturnValue(true),
      }),
    ]);

    const result = proposalReferencedAdapterNamespaces({});

    expect(result).toStrictEqual([
      KnownCaipNamespace.Tron,
      KnownCaipNamespace.Bip122,
    ]);
  });

  it('returns an empty array when no adapter recognizes the proposal', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
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

describe('mapRequestForSnap', () => {
  it('extracts the CAIP-2 namespace from the scope and looks up the adapter once', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    mapRequestForSnap({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [],
    });

    expect(mockedGetAdapter).toHaveBeenCalledTimes(1);
    expect(mockedGetAdapter).toHaveBeenCalledWith('tron');
  });

  it('delegates to the matched adapter and returns the mapped request', () => {
    const adapterMapped = { method: 'signTransaction', params: { foo: 1 } };
    const fakeAdapter = createFakeAdapter({
      namespace: KnownCaipNamespace.Tron,
      mapRequestInbound: jest.fn().mockReturnValue(adapterMapped),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const result = mapRequestForSnap({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [{ raw_data_hex: '0xabc' }],
    });

    expect(result).toBe(adapterMapped);
    expect(fakeAdapter.mapRequestInbound).toHaveBeenCalledWith({
      method: 'tron_signTransaction',
      params: [{ raw_data_hex: '0xabc' }],
    });
  });

  it('returns the original method/params when no adapter is registered for the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    const result = mapRequestForSnap({
      scope: 'eip155:1',
      method: 'eth_sign',
      params: ['0x1', '0x2'],
    });

    expect(result).toStrictEqual({
      method: 'eth_sign',
      params: ['0x1', '0x2'],
    });
  });
});

describe('normalizeSnapResponse', () => {
  it('delegates to the matched adapter and returns its normalized result', () => {
    const adapterResult = { txID: 'tx-1', signature: ['0xsig'] };
    const fakeAdapter = createFakeAdapter({
      namespace: KnownCaipNamespace.Tron,
      mapRequestOutbound: jest.fn().mockReturnValue(adapterResult),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const result = normalizeSnapResponse({
      scope: 'tron:728126428',
      method: 'tron_signTransaction',
      params: [],
      result: { signature: '0xsig' },
    });

    expect(result).toBe(adapterResult);
    expect(fakeAdapter.mapRequestOutbound).toHaveBeenCalledWith({
      method: 'tron_signTransaction',
      params: [],
      result: { signature: '0xsig' },
    });
  });

  it('returns the raw snap result when no adapter is registered for the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);
    const snapResult = { hello: 'world' };

    const result = normalizeSnapResponse({
      scope: 'eip155:1',
      method: 'eth_sign',
      params: [],
      result: snapResult,
    });

    expect(result).toBe(snapResult);
  });
});

describe('getRedirectMethodsForChain', () => {
  it('returns the redirectMethods of the adapter for the scope namespace', () => {
    mockedGetAdapter.mockReturnValue(
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        redirectMethods: ['tron_signTransaction', 'tron_signMessage'],
      }),
    );

    const result = getRedirectMethodsForChain('tron:728126428');

    expect(result).toStrictEqual(['tron_signTransaction', 'tron_signMessage']);
  });

  it('returns an empty array when no adapter matches the scope', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    expect(getRedirectMethodsForChain('eip155:1')).toStrictEqual([]);
  });
});

describe('CAIP chain id normalization helpers', () => {
  it('normalizes tron hex chain ids inbound to decimal', () => {
    expect(normalizeCaipChainIdInbound('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
  });

  it('normalizes tron decimal chain ids outbound to hex', () => {
    expect(normalizeCaipChainIdOutbound('tron:728126428')).toBe(
      'tron:0x2b6653dc',
    );
  });

  it('keeps non-numeric tron chain references unchanged outbound', () => {
    expect(normalizeCaipChainIdOutbound('tron:mainnet')).toBe('tron:mainnet');
  });
});
