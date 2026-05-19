import {
  getCaipAccountIdsFromCaip25CaveatValue,
  type Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

import Engine from '../../../Engine';
import { getPermittedChains } from '../../../Permissions';
import {
  enrichCaveatValue,
  getScopedPermissions,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeTronAccountIdOutbound,
  tronAdapter,
} from './adapter';

jest.mock('@metamask/chain-agnostic-permission', () => ({
  ...jest.requireActual('@metamask/chain-agnostic-permission'),
  getCaipAccountIdsFromCaip25CaveatValue: jest.fn(),
}));

jest.mock('../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: {
        getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([]),
      },
      PermissionController: {
        getCaveat: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../Permissions', () => ({
  getPermittedChains: jest.fn(),
}));

jest.mock('../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockedGetAccountsFromSelectedAccountGroup = Engine.context
  .AccountTreeController.getAccountsFromSelectedAccountGroup as jest.Mock;
const mockedGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockedGetPermittedChains = getPermittedChains as jest.Mock;
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
  mockedGetCaveat.mockReturnValue(undefined);
  mockedGetPermittedChains.mockResolvedValue([]);
  mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
});

describe('multichain/tron - adapter helpers', () => {
  it('normalizes inbound Tron CAIP chain ids from hex to decimal', () => {
    expect(normalizeCaipChainIdInbound('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
    expect(normalizeCaipChainIdInbound('eip155:1')).toBe('eip155:1');
  });

  it('normalizes outbound Tron CAIP chain ids and account ids from decimal to hex', () => {
    expect(normalizeCaipChainIdOutbound('tron:728126428')).toBe(
      'tron:0x2b6653dc',
    );
    expect(normalizeTronAccountIdOutbound('tron:728126428:TAddress')).toBe(
      'tron:0x2b6653dc:TAddress',
    );
  });

  it('adds the Tron optional scope when a proposal references Tron', () => {
    const caveatValue = {
      requiredScopes: {},
      optionalScopes: {},
      isMultichainOrigin: true,
      sessionProperties: {},
    } as Caip25CaveatValue;

    expect(
      enrichCaveatValue({
        proposal: {
          requiredNamespaces: {},
          optionalNamespaces: { tron: { chains: ['tron:728126428'], methods: [], events: [] } },
        },
        caveatValue,
      }),
    ).toStrictEqual({
      ...caveatValue,
      optionalScopes: {
        'tron:728126428': { accounts: [] },
      },
    });
  });

  it('returns scoped permissions for permitted Tron chains and accounts', async () => {
    mockedGetPermittedChains.mockResolvedValue(['eip155:1', 'tron:728126428']);
    mockedGetCaveat.mockReturnValue({ value: {} });
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
      'eip155:1:0xabc',
      'tron:728126428:TAddrA',
    ]);

    await expect(
      getScopedPermissions({ channelId: 'wc-topic' }),
    ).resolves.toStrictEqual({
      chains: ['tron:0x2b6653dc'],
      methods: ['tron_signTransaction', 'tron_signMessage'],
      events: [],
      accounts: ['tron:0x2b6653dc:TAddrA'],
    });
  });

  it('prioritizes selected Tron account ids when building scoped permissions', async () => {
    mockedGetPermittedChains.mockResolvedValue(['tron:728126428']);
    mockedGetCaveat.mockReturnValue({ value: {} });
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
      'tron:728126428:TAddrA',
      'tron:728126428:TAddrB',
    ]);
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([
      { address: 'TAddrB', scopes: ['tron:728126428'] },
    ]);

    const result = await getScopedPermissions({ channelId: 'wc-topic' });

    expect(result?.accounts).toStrictEqual([
      'tron:0x2b6653dc:TAddrB',
      'tron:0x2b6653dc:TAddrA',
    ]);
  });

  it('returns undefined when there are no Tron chains or accounts', async () => {
    mockedGetPermittedChains.mockResolvedValue(['eip155:1']);

    await expect(
      getScopedPermissions({ channelId: 'wc-topic' }),
    ).resolves.toBeUndefined();

    mockedGetPermittedChains.mockResolvedValue(['tron:728126428']);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

    await expect(
      getScopedPermissions({ channelId: 'wc-topic' }),
    ).resolves.toBeUndefined();
  });

  it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
    mockedGetPermittedChains.mockResolvedValue(['tron:728126428']);
    mockedGetCaveat.mockImplementation(() => {
      throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
    });

    await expect(
      getScopedPermissions({ channelId: 'wc-topic' }),
    ).resolves.toBeUndefined();
  });
});

describe('multichain/tron - tronAdapter', () => {
  it('declares the Tron CAIP namespace and approved methods', () => {
    expect(tronAdapter.namespace).toBe('tron');
    expect(tronAdapter.redirectMethods).toStrictEqual([
      'tron_signTransaction',
      'tron_signMessage',
    ]);
    expect(tronAdapter.approvedMethods).toStrictEqual([
      'tron_signTransaction',
      'tron_signMessage',
    ]);
  });

  it('delegates request mapping to mapper helpers', () => {
    expect(
      tronAdapter.mapRequestInbound({
        method: 'tron_signMessage',
        params: [{ address: 'TAddr', message: 'hello' }],
      }),
    ).toStrictEqual({
      method: 'signMessage',
      params: { address: 'TAddr', message: 'aGVsbG8=' },
    });

    const original = { raw_data_hex: '0xabc' };

    expect(
      tronAdapter.mapRequestOutbound({
        method: 'tron_signTransaction',
        params: [{ transaction: { transaction: original } }],
        result: { signature: '0xsig' },
      }),
    ).toStrictEqual({
      raw_data_hex: '0xabc',
      signature: ['0xsig'],
    });
  });
});
