import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import { type CaipChainId, KnownCaipNamespace } from '@metamask/utils';
import {
  enrichCaveatValueWithAdapterPermissions,
  getAdaptersScopedPermissions,
} from './helpers';
import type { ChainAdapter, NamespaceConfig } from './types';
import {
  getRedirectMethodsForChain,
  mapRequestInbound,
  mapRequestOutbound,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
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

function createFakeAdapter(
  overrides: Partial<ChainAdapter> = {},
): ChainAdapter {
  return {
    namespace: (overrides.namespace ?? 'fake') as KnownCaipNamespace,
    redirectMethods: overrides.redirectMethods ?? [],
    approvedMethods: overrides.approvedMethods ?? [],
    enrichCaveatValue: overrides.enrichCaveatValue,
    mapRequestInbound:
      overrides.mapRequestInbound ??
      jest
        .fn()
        .mockImplementation(({ method, params }) => ({ method, params })),
    mapRequestOutbound:
      overrides.mapRequestOutbound ??
      jest.fn().mockImplementation(({ result }) => result),
    getScopedPermissions:
      overrides.getScopedPermissions ?? jest.fn().mockResolvedValue(undefined),
    normalizeCaipChainIdInbound:
      overrides.normalizeCaipChainIdInbound ??
      jest.fn().mockImplementation((caipChainId: CaipChainId) => caipChainId),
    normalizeCaipChainIdOutbound:
      overrides.normalizeCaipChainIdOutbound ??
      jest.fn().mockImplementation((caipChainId: CaipChainId) => caipChainId),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('enrichCaveatValueWithAdapterPermissions', () => {
  const caveatValue = {
    requiredScopes: {},
    optionalScopes: {},
  } as Caip25CaveatValue;

  it('invokes enrichCaveatValue for every adapter that declares one', () => {
    const tronCaveatValue = {
      ...caveatValue,
      optionalScopes: { tron: { accounts: [] } },
    } as Caip25CaveatValue;
    const solanaCaveatValue = {
      ...caveatValue,
      optionalScopes: { solana: { accounts: [] } },
    } as Caip25CaveatValue;
    const tronHook = jest.fn().mockReturnValue(tronCaveatValue);
    const solanaHook = jest.fn().mockReturnValue(solanaCaveatValue);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        enrichCaveatValue: tronHook,
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        enrichCaveatValue: solanaHook,
      }),
    ]);

    const result = enrichCaveatValueWithAdapterPermissions({
      proposal: {
        requiredNamespaces: {
          tron: {
            chains: ['tron:728126428'],
            methods: [],
            events: [],
          },
        },
        optionalNamespaces: {},
      },
      caveatValue,
    });

    expect(tronHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      caveatValue,
    });
    expect(solanaHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      caveatValue: tronCaveatValue,
    });
    expect(result).toBe(solanaCaveatValue);
  });

  it('skips adapters that do not declare an enrich hook', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: KnownCaipNamespace.Bip122 }),
    ]);

    expect(
      enrichCaveatValueWithAdapterPermissions({
        proposal: {
          optionalNamespaces: {},
          requiredNamespaces: {},
        },
        caveatValue,
      }),
    ).toBe(caveatValue);
  });

  it('continues running other adapters when one enrich hook throws', () => {
    const failingHook = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const followingHook = jest.fn().mockReturnValue(caveatValue);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'a' as KnownCaipNamespace,
        enrichCaveatValue: failingHook,
      }),
      createFakeAdapter({
        namespace: 'b' as KnownCaipNamespace,
        enrichCaveatValue: followingHook,
      }),
    ]);

    const result = enrichCaveatValueWithAdapterPermissions({
      proposal: {
        optionalNamespaces: {},
        requiredNamespaces: {},
      },
      caveatValue,
    });

    expect(failingHook).toHaveBeenCalled();
    expect(followingHook).toHaveBeenCalledWith({
      proposal: expect.any(Object),
      caveatValue,
    });
    expect(result).toBe(caveatValue);
  });
});

describe('getAdaptersScopedPermissions', () => {
  it('returns an empty object when no adapters are registered', async () => {
    mockedGetAllAdapters.mockReturnValue([]);

    const result = await getAdaptersScopedPermissions({ channelId: 'channel' });

    expect(result).toStrictEqual({});
  });

  it('asks every adapter for its slice and aggregates the results by namespace', async () => {
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
        getScopedPermissions: jest.fn().mockResolvedValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        getScopedPermissions: jest.fn().mockResolvedValue(solanaSlice),
      }),
    ]);

    const result = await getAdaptersScopedPermissions({ channelId: 'channel' });

    expect(result).toStrictEqual({ tron: tronSlice, solana: solanaSlice });
  });

  it('omits adapters whose getScopedPermissions returns undefined', async () => {
    const tronSlice: NamespaceConfig = {
      chains: ['tron:728126428'],
      methods: [],
      events: [],
      accounts: [],
    };
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        getScopedPermissions: jest.fn().mockResolvedValue(tronSlice),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        getScopedPermissions: jest.fn().mockResolvedValue(undefined),
      }),
    ]);

    const result = await getAdaptersScopedPermissions({ channelId: 'channel' });

    expect(result).toStrictEqual({ tron: tronSlice });
    expect(result).not.toHaveProperty(KnownCaipNamespace.Solana);
  });

  it('passes the channel id to every adapter', async () => {
    const getScopedPermissions = jest.fn().mockResolvedValue(undefined);
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        getScopedPermissions,
      }),
    ]);

    await getAdaptersScopedPermissions({ channelId: 'channel-1' });

    expect(getScopedPermissions).toHaveBeenCalledWith({
      channelId: 'channel-1',
    });
  });
});

describe('mapRequestInbound', () => {
  it('extracts the CAIP-2 namespace from the scope and looks up the adapter once', () => {
    mockedGetAdapter.mockReturnValue(undefined);

    mapRequestInbound({
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

    const result = mapRequestInbound({
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

    const result = mapRequestInbound({
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

describe('mapRequestOutbound', () => {
  it('delegates to the matched adapter and returns its normalized result', () => {
    const adapterResult = { txID: 'tx-1', signature: ['0xsig'] };
    const fakeAdapter = createFakeAdapter({
      namespace: KnownCaipNamespace.Tron,
      mapRequestOutbound: jest.fn().mockReturnValue(adapterResult),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const result = mapRequestOutbound({
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

    const result = mapRequestOutbound({
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
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        normalizeCaipChainIdInbound: jest
          .fn()
          .mockReturnValue('tron:728126428'),
      }),
    ]);

    expect(normalizeCaipChainIdInbound('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
  });

  it('normalizes tron decimal chain ids outbound to hex', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        normalizeCaipChainIdOutbound: jest
          .fn()
          .mockReturnValue('tron:0x2b6653dc'),
      }),
    ]);

    expect(normalizeCaipChainIdOutbound('tron:728126428')).toBe(
      'tron:0x2b6653dc',
    );
  });

  it('keeps non-numeric tron chain references unchanged outbound', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
      }),
    ]);

    expect(normalizeCaipChainIdOutbound('tron:mainnet')).toBe('tron:mainnet');
  });
});
