import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import {
  type CaipAccountId,
  type CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import {
  buildSessionPropertiesByAdapters,
  enrichCaveatValueByAdapters,
  getScopedPermissionsByAdapters,
} from './helpers';
import type { ChainAdapter, NamespaceConfig } from './types';
import {
  handleRequestByAdapter,
  normalizeCaipChainIdInboundByAdapter,
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
    getSessionProperties: overrides.getSessionProperties,
    getScopedPermissions:
      overrides.getScopedPermissions ?? jest.fn().mockResolvedValue(undefined),
    handleRequest:
      overrides.handleRequest ?? jest.fn().mockResolvedValue(undefined),
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

describe('enrichCaveatValueByAdapters', () => {
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

    const result = enrichCaveatValueByAdapters({
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
      enrichCaveatValueByAdapters({
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

    const result = enrichCaveatValueByAdapters({
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

describe('buildSessionPropertiesByAdapters', () => {
  const proposal = {
    requiredNamespaces: {},
    optionalNamespaces: {},
  };

  it('returns an empty object when no adapter declares getSessionProperties', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({ namespace: KnownCaipNamespace.Tron }),
    ]);

    expect(buildSessionPropertiesByAdapters({ proposal })).toStrictEqual({});
  });

  it('merges sessionProperties from every adapter that declares them', () => {
    const tronHook = jest.fn().mockReturnValue({ tron_method_version: 'v1' });
    const solanaHook = jest.fn().mockReturnValue({ solana_flag: 'on' });
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        getSessionProperties: tronHook,
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        getSessionProperties: solanaHook,
      }),
    ]);

    expect(buildSessionPropertiesByAdapters({ proposal })).toStrictEqual({
      tron_method_version: 'v1',
      solana_flag: 'on',
    });
    expect(tronHook).toHaveBeenCalledWith({ proposal });
    expect(solanaHook).toHaveBeenCalledWith({ proposal });
  });

  it('skips adapters whose hook returns undefined', () => {
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: KnownCaipNamespace.Tron,
        getSessionProperties: jest
          .fn()
          .mockReturnValue({ tron_method_version: 'v1' }),
      }),
      createFakeAdapter({
        namespace: KnownCaipNamespace.Solana,
        getSessionProperties: jest.fn().mockReturnValue(undefined),
      }),
    ]);

    expect(buildSessionPropertiesByAdapters({ proposal })).toStrictEqual({
      tron_method_version: 'v1',
    });
  });

  it('continues running other adapters when one hook throws', () => {
    const failingHook = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const followingHook = jest.fn().mockReturnValue({ flag: 'on' });
    mockedGetAllAdapters.mockReturnValue([
      createFakeAdapter({
        namespace: 'a' as KnownCaipNamespace,
        getSessionProperties: failingHook,
      }),
      createFakeAdapter({
        namespace: 'b' as KnownCaipNamespace,
        getSessionProperties: followingHook,
      }),
    ]);

    expect(buildSessionPropertiesByAdapters({ proposal })).toStrictEqual({
      flag: 'on',
    });
    expect(failingHook).toHaveBeenCalled();
    expect(followingHook).toHaveBeenCalled();
  });
});

describe('getScopedPermissionsByAdapters', () => {
  it('returns an empty object when no adapters are registered', async () => {
    mockedGetAllAdapters.mockReturnValue([]);

    const result = await getScopedPermissionsByAdapters({
      channelId: 'channel',
    });

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

    const result = await getScopedPermissionsByAdapters({
      channelId: 'channel',
    });

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

    const result = await getScopedPermissionsByAdapters({
      channelId: 'channel',
    });

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

    await getScopedPermissionsByAdapters({ channelId: 'channel-1' });

    expect(getScopedPermissions).toHaveBeenCalledWith({
      channelId: 'channel-1',
    });
  });
});

describe('handleRequestByAdapter', () => {
  it('delegates to the matched adapter and returns its result', async () => {
    const adapterResult = { signature: '0xsig' };
    const fakeAdapter = createFakeAdapter({
      namespace: KnownCaipNamespace.Tron,
      handleRequest: jest.fn().mockResolvedValue(adapterResult),
    });
    mockedGetAdapter.mockReturnValue(fakeAdapter);

    const args = {
      origin: 'channelId',
      connectedAddresses: ['tron:0x2b6653dc:TAddr' as CaipAccountId],
      scope: 'tron:0x2b6653dc' as CaipChainId,
      requestId: 1,
      method: 'tron_signMessage',
      params: [{ address: 'TAddr', message: 'hello' }],
    };

    const result = await handleRequestByAdapter(args);

    expect(result).toBe(adapterResult);
    expect(mockedGetAdapter).toHaveBeenCalledWith('tron');
    expect(fakeAdapter.handleRequest).toHaveBeenCalledWith(args);
  });

  it('throws when no adapter is registered for the scope', async () => {
    mockedGetAdapter.mockReturnValue(undefined);

    await expect(
      handleRequestByAdapter({
        origin: 'channelId',
        connectedAddresses: [],
        scope: 'tron:0x2b6653dc',
        requestId: 1,
        method: 'tron_signMessage',
        params: [],
      }),
    ).rejects.toThrow('No WalletConnect adapter registered for tron');
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

    expect(normalizeCaipChainIdInboundByAdapter('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
  });
});
