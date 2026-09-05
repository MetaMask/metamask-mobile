import { XlmScope } from '@metamask/keyring-api';
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
  stellarAdapter,
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
const mockedCallStellarSnap = (
  createSnapCaller as unknown as () => jest.Mock
)();
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

describe('multichain/stellar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallStellarSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('enrichCaveatValue', () => {
    it('adds the Stellar optional scope when a proposal references Stellar', () => {
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
              stellar: { chains: [XlmScope.Pubnet], methods: [], events: [] },
            },
          },
          caveatValue,
        }),
      ).toStrictEqual({
        ...caveatValue,
        optionalScopes: {
          [XlmScope.Pubnet]: { accounts: [] },
        },
      });
    });

    it('falls back to Stellar Mainnet when only unsupported Stellar scopes are requested', () => {
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
              stellar: {
                chains: [XlmScope.Testnet],
                methods: [],
                events: [],
              },
            },
          },
          caveatValue,
        }),
      ).toStrictEqual({
        ...caveatValue,
        optionalScopes: {
          [XlmScope.Pubnet]: { accounts: [] },
        },
      });
    });
  });

  describe('getScopedPermissions', () => {
    it('returns scoped permissions for permitted Stellar chains and accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([
        'eip155:1',
        XlmScope.Pubnet,
      ]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        'eip155:1:0xabc',
        `${XlmScope.Pubnet}:StellarAddrA`,
      ]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toStrictEqual({
        chains: [XlmScope.Pubnet],
        methods: ['stellar_signXDR'],
        events: [],
        accounts: [`${XlmScope.Pubnet}:StellarAddrA`],
      });
    });

    it('prioritizes selected Stellar account ids when building scoped permissions', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([XlmScope.Pubnet]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        `${XlmScope.Pubnet}:StellarAddrA`,
        `${XlmScope.Pubnet}:StellarAddrB`,
      ]);
      mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([
        { address: 'StellarAddrB', scopes: [XlmScope.Pubnet] },
      ]);

      const result = await getScopedPermissions({ channelId: 'wc-topic' });

      expect(result?.accounts).toStrictEqual([
        `${XlmScope.Pubnet}:StellarAddrB`,
        `${XlmScope.Pubnet}:StellarAddrA`,
      ]);
    });

    it('returns undefined when there are no Stellar chains or accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue(['eip155:1']);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();

      mockedGetPermittedCaipChainIds.mockResolvedValue([XlmScope.Pubnet]);
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });

    it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([XlmScope.Pubnet]);
      mockedGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
      });

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('stellarAdapter', () => {
    it('declares the Stellar CAIP namespace and approved methods', () => {
      expect(stellarAdapter.namespace).toBe('stellar');
      expect(stellarAdapter.redirectMethods).toStrictEqual(['stellar_signXDR']);
      expect(stellarAdapter.approvedMethods).toStrictEqual(['stellar_signXDR']);
      expect(stellarAdapter.getSessionProperties).toBeUndefined();
    });

    it('handles stellar_signXDR by mapping, routing, and normalizing the result', async () => {
      mockedCallStellarSnap.mockResolvedValue({ signedTxXdr: 'signed-xdr' });

      const result = await stellarAdapter.handleRequest({
        connectedAddresses: [
          `${XlmScope.Pubnet}:StellarAddrA` as CaipAccountId,
        ],
        scope: XlmScope.Pubnet as CaipChainId,
        requestId: 1,
        method: 'stellar_signXDR',
        params: { xdr: 'unsigned-xdr' },
      });

      expect(mockedCallStellarSnap).toHaveBeenCalledWith({
        connectedAddresses: [`${XlmScope.Pubnet}:StellarAddrA`],
        scope: XlmScope.Pubnet,
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            xdr: 'unsigned-xdr',
          },
        },
      });
      expect(mockedCallStellarSnap).toHaveBeenCalledWith(
        expect.not.objectContaining({ origin: expect.anything() }),
      );
      expect(result).toStrictEqual({ signedXDR: 'signed-xdr' });
    });

    it('rejects unsupported WalletConnect methods', async () => {
      const args = {
        connectedAddresses: [
          `${XlmScope.Pubnet}:StellarAddrA` as CaipAccountId,
        ],
        scope: XlmScope.Pubnet as CaipChainId,
        requestId: 1,
        method: 'stellar_signAndSubmitXDR',
        params: { xdr: 'unsigned-xdr' },
      };

      await expect(
        // @ts-expect-error - the wallet does not expose sign-and-submit
        stellarAdapter.handleRequest(args),
      ).rejects.toThrow(
        'WalletConnect Stellar method stellar_signAndSubmitXDR is not supported',
      );

      expect(mockedCallStellarSnap).not.toHaveBeenCalled();
    });
  });
});
