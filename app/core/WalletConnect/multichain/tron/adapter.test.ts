import {
  getCaipAccountIdsFromCaip25CaveatValue,
  type Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';
import type { CaipAccountId, CaipChainId } from '@metamask/utils';

import Engine from '../../../Engine';
import { getPermittedCaipChainIds } from '../../../Permissions';
import { createSnapCaller } from '../router';
import {
  enrichCaveatValue,
  getScopedPermissions,
  getSessionProperties,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeTronAccountIdInbound,
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
  getPermittedCaipChainIds: jest.fn(),
}));

jest.mock('../router', () => {
  const snapCallerMock = jest.fn();
  return {
    createSnapCaller: () => snapCallerMock,
  };
});

jest.mock('../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockedGetAccountsFromSelectedAccountGroup = Engine.context
  .AccountTreeController.getAccountsFromSelectedAccountGroup as jest.Mock;
const mockedGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockedGetPermittedCaipChainIds = getPermittedCaipChainIds as jest.Mock;
const mockedCallTronSnap = (createSnapCaller as unknown as () => jest.Mock)();
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

describe('multichain/tron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallTronSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('normalizeCaipChainIdInbound', () => {
    it('normalizes Tron CAIP chain ids from hex to decimal', () => {
      expect(normalizeCaipChainIdInbound('tron:0x2b6653dc')).toBe(
        'tron:728126428',
      );
    });

    it('passes non-Tron CAIP chain ids through unchanged', () => {
      expect(normalizeCaipChainIdInbound('eip155:1')).toBe('eip155:1');
    });
  });

  describe('normalizeCaipChainIdOutbound', () => {
    it('normalizes Tron CAIP chain ids from decimal to hex', () => {
      expect(normalizeCaipChainIdOutbound('tron:728126428')).toBe(
        'tron:0x2b6653dc',
      );
    });
  });

  describe('normalizeTronAccountIdOutbound', () => {
    it('normalizes Tron account ids from decimal to hex chain references', () => {
      expect(normalizeTronAccountIdOutbound('tron:728126428:TAddress')).toBe(
        'tron:0x2b6653dc:TAddress',
      );
    });
  });

  describe('normalizeTronAccountIdInbound', () => {
    it('normalizes Tron account ids from hex chain references to decimal', () => {
      expect(normalizeTronAccountIdInbound('tron:0x2b6653dc:TAddress')).toBe(
        'tron:728126428:TAddress',
      );
    });
  });

  describe('enrichCaveatValue', () => {
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
            optionalNamespaces: {
              tron: { chains: ['tron:728126428'], methods: [], events: [] },
            },
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
  });

  describe('getSessionProperties', () => {
    it('advertises tron_method_version v1 when the proposal references Tron', () => {
      expect(
        getSessionProperties({
          proposal: {
            requiredNamespaces: {},
            optionalNamespaces: {
              tron: { chains: ['tron:728126428'], methods: [], events: [] },
            },
          },
        }),
      ).toStrictEqual({ tron_method_version: 'v1' });
    });

    it('returns undefined when the proposal does not reference Tron', () => {
      expect(
        getSessionProperties({
          proposal: {
            requiredNamespaces: {
              eip155: { chains: ['eip155:1'], methods: [], events: [] },
            },
            optionalNamespaces: {},
          },
        }),
      ).toBeUndefined();
    });
  });

  describe('getScopedPermissions', () => {
    it('returns scoped permissions for permitted Tron chains and accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([
        'eip155:1',
        'tron:728126428',
      ]);
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
      mockedGetPermittedCaipChainIds.mockResolvedValue(['tron:728126428']);
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
      mockedGetPermittedCaipChainIds.mockResolvedValue(['eip155:1']);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();

      mockedGetPermittedCaipChainIds.mockResolvedValue(['tron:728126428']);
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });

    it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue(['tron:728126428']);
      mockedGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
      });

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('tronAdapter', () => {
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
      expect(tronAdapter.getSessionProperties).toBe(getSessionProperties);
    });

    it('handles requests by mapping, routing, and normalizing the result', async () => {
      mockedCallTronSnap.mockResolvedValue({
        signature: '0xsig',
      });

      const result = await tronAdapter.handleRequest({
        connectedAddresses: ['tron:0x2b6653dc:TTestAddress' as CaipAccountId],
        scope: 'tron:728126428' as CaipChainId,
        requestId: 1,
        method: 'tron_signTransaction',
        params: {
          address: 'TTestAddress',
          transaction: {
            transaction: {
              raw_data_hex: '0xabc',
              txID: 'tx-123',
            },
          },
        },
      });

      expect(mockedCallTronSnap).toHaveBeenCalledWith({
        connectedAddresses: ['tron:728126428:TTestAddress'],
        scope: 'tron:728126428',
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            address: 'TTestAddress',
            transaction: {
              rawDataHex: '0xabc',
            },
          },
        },
      });
      expect(result).toStrictEqual({
        raw_data_hex: '0xabc',
        txID: 'tx-123',
        signature: ['0xsig'],
      });
    });

    it('does not forward any dapp origin to the Snap routing service', async () => {
      mockedCallTronSnap.mockResolvedValue({
        signature: '0xsig',
      });

      await tronAdapter.handleRequest({
        connectedAddresses: ['tron:0x2b6653dc:TTestAddress' as CaipAccountId],
        scope: 'tron:728126428' as CaipChainId,
        requestId: 1,
        method: 'tron_signMessage',
        params: {
          address: 'TTestAddress',
          message: 'hello',
        },
      });

      expect(mockedCallTronSnap).toHaveBeenCalledWith(
        expect.objectContaining({
          connectedAddresses: ['tron:728126428:TTestAddress'],
          scope: 'tron:728126428',
          requestId: 1,
        }),
      );
      expect(mockedCallTronSnap).toHaveBeenCalledWith(
        expect.not.objectContaining({ origin: expect.anything() }),
      );
    });

    it('rejects unsupported WalletConnect methods', async () => {
      const args = {
        connectedAddresses: [] as CaipAccountId[],
        scope: 'tron:728126428' as CaipChainId,
        requestId: 1,
        method: 'tron_unknownMethod',
        params: {},
      };

      await expect(
        // @ts-expect-error - misbehaving client sending an unapproved method
        tronAdapter.handleRequest(args),
      ).rejects.toThrow(
        'WalletConnect Tron method tron_unknownMethod is not supported',
      );

      expect(mockedCallTronSnap).not.toHaveBeenCalled();
    });
  });
});
