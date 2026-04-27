import { TrxAccountType } from '@metamask/keyring-api';

import { tronAdapter } from './adapter';

const mockListAccounts = jest.fn();
const mockGetCaveat = jest.fn();
const mockAddPermittedAccounts = jest.fn();

jest.mock('../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: {
        listAccounts: () => mockListAccounts(),
      },
      PermissionController: {
        getCaveat: (...args: unknown[]) => mockGetCaveat(...args),
      },
    },
  },
}));

jest.mock('../../../Permissions', () => ({
  addPermittedAccounts: (...args: unknown[]) =>
    mockAddPermittedAccounts(...args),
}));

jest.mock('../../../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockListAccounts.mockReturnValue([]);
  mockGetCaveat.mockReturnValue(undefined);
});

describe('tronAdapter', () => {
  it('exposes the redirect-eligible Tron methods', () => {
    expect(tronAdapter.namespace).toBe('tron');
    expect(tronAdapter.redirectMethods).toEqual([
      'tron_signTransaction',
      'tron_signMessage',
    ]);
  });

  describe('normalizeCaipChainId', () => {
    it('converts hex chain references to decimal', () => {
      expect(tronAdapter.normalizeCaipChainId?.('tron:0x2b6653dc')).toBe(
        'tron:728126428',
      );
    });
    it('leaves decimal chain references unchanged', () => {
      expect(tronAdapter.normalizeCaipChainId?.('tron:728126428')).toBe(
        'tron:728126428',
      );
    });
  });

  describe('onBeforeApprove', () => {
    it('seeds permitted accounts for every Tron EOA the wallet manages', () => {
      mockListAccounts.mockReturnValue([
        { type: TrxAccountType.Eoa, address: 'TX1' },
        { type: TrxAccountType.Eoa, address: 'TX2' },
        { type: 'eip155:eoa', address: '0xabc' },
      ]);

      tronAdapter.onBeforeApprove?.({
        proposal: {},
        channelId: 'channel',
      });

      expect(mockAddPermittedAccounts).toHaveBeenCalledWith(
        'channel',
        expect.arrayContaining([
          expect.stringMatching(/^tron:.+:TX1$/),
          expect.stringMatching(/^tron:.+:TX2$/),
        ]),
      );
    });

    it('is a no-op when the wallet has no Tron EOAs', () => {
      mockListAccounts.mockReturnValue([]);
      tronAdapter.onBeforeApprove?.({
        proposal: {},
        channelId: 'channel',
      });
      expect(mockAddPermittedAccounts).not.toHaveBeenCalled();
    });
  });

  describe('buildNamespaceSlice', () => {
    it('returns undefined when neither dapp nor wallet provide Tron data', () => {
      expect(
        tronAdapter.buildNamespaceSlice({
          proposal: {},
          channelId: 'channel',
        }),
      ).toBeUndefined();
    });

    it('echoes back dapp-requested chains and falls back to wallet EOAs', () => {
      mockListAccounts.mockReturnValue([
        { type: TrxAccountType.Eoa, address: 'TJ4' },
        { type: 'eip155:eoa', address: '0xabc' },
      ]);

      const slice = tronAdapter.buildNamespaceSlice({
        proposal: {
          optionalNamespaces: {
            tron: {
              chains: ['tron:0x94a9059e'],
              methods: ['tron_signTransaction'],
              events: [],
            },
          },
        },
        channelId: 'channel',
      });

      expect(slice).toEqual({
        chains: ['tron:0x94a9059e'],
        methods: ['tron_signTransaction', 'tron_signMessage'],
        events: [],
        accounts: ['tron:0x94a9059e:TJ4'],
      });
    });

    it('prefers permitted accounts from the CAIP-25 caveat over wallet EOAs', () => {
      mockListAccounts.mockReturnValue([
        { type: TrxAccountType.Eoa, address: 'TUNUSED' },
      ]);
      mockGetCaveat.mockReturnValue({
        value: {
          requiredScopes: {},
          optionalScopes: {
            'tron:728126428': {
              accounts: ['tron:728126428:TPERMITTED'],
            },
          },
          sessionProperties: {},
          isMultichainOrigin: false,
        },
      });

      const slice = tronAdapter.buildNamespaceSlice({
        proposal: {
          optionalNamespaces: {
            tron: {
              chains: ['tron:728126428'],
              methods: ['tron_signTransaction'],
              events: [],
            },
          },
        },
        channelId: 'channel',
      });

      expect(slice?.accounts).toEqual(['tron:728126428:TPERMITTED']);
    });
  });

  it('exposes Tron request and response mappers', () => {
    expect(typeof tronAdapter.mapRequest).toBe('function');
    expect(typeof tronAdapter.mapResponse).toBe('function');
  });
});
