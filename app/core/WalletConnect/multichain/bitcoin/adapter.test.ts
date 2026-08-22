import { BtcScope } from '@metamask/keyring-api';
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
  bitcoinAdapter,
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
const mockedCallBitcoinSnap = (
  createSnapCaller as unknown as () => jest.Mock
)();
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

describe('multichain/bitcoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallBitcoinSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('enrichCaveatValue', () => {
    it('adds the Bitcoin optional scope when a proposal references Bitcoin', () => {
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
              bip122: {
                chains: [BtcScope.Mainnet],
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
          [BtcScope.Mainnet]: { accounts: [] },
        },
      });
    });

    it('falls back to Bitcoin Mainnet when only unsupported Bitcoin scopes are requested', () => {
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
              bip122: {
                chains: [BtcScope.Testnet],
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
          [BtcScope.Mainnet]: { accounts: [] },
        },
      });
    });
  });

  describe('getScopedPermissions', () => {
    it('returns scoped permissions for permitted Bitcoin chains and accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([
        'eip155:1',
        BtcScope.Mainnet,
      ]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        'eip155:1:0xabc',
        `${BtcScope.Mainnet}:bc1qaddrA`,
      ]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toStrictEqual({
        chains: [BtcScope.Mainnet],
        methods: [
          'bitcoin_getAccountAddresses',
          'bitcoin_signMessage',
          'bitcoin_signPsbt',
          'bitcoin_sendTransfer',
        ],
        events: [],
        accounts: [`${BtcScope.Mainnet}:bc1qaddrA`],
      });
    });

    it('returns undefined when there are no Bitcoin chains or accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue(['eip155:1']);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();

      mockedGetPermittedCaipChainIds.mockResolvedValue([BtcScope.Mainnet]);
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });

    it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([BtcScope.Mainnet]);
      mockedGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
      });

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('bitcoinAdapter', () => {
    it('declares the Bitcoin CAIP namespace and approved methods', () => {
      expect(bitcoinAdapter.namespace).toBe('bip122');
      expect(bitcoinAdapter.redirectMethods).toStrictEqual([
        'bitcoin_signMessage',
        'bitcoin_signPsbt',
        'bitcoin_sendTransfer',
      ]);
      expect(bitcoinAdapter.approvedMethods).toStrictEqual([
        'bitcoin_getAccountAddresses',
        'bitcoin_signMessage',
        'bitcoin_signPsbt',
        'bitcoin_sendTransfer',
      ]);
      expect(bitcoinAdapter.getSessionProperties).toBeUndefined();
    });

    it('returns connected account addresses for bitcoin_getAccountAddresses', async () => {
      await expect(
        bitcoinAdapter.handleRequest({
          connectedAddresses: [
            `${BtcScope.Mainnet}:bc1qaddrA` as CaipAccountId,
            `${BtcScope.Mainnet}:bc1qaddrB` as CaipAccountId,
          ],
          scope: BtcScope.Mainnet as CaipChainId,
          requestId: 1,
          method: 'bitcoin_getAccountAddresses',
          params: { account: 'bc1qaddrA' },
        }),
      ).resolves.toStrictEqual([
        { address: 'bc1qaddrA' },
        { address: 'bc1qaddrB' },
      ]);

      expect(mockedCallBitcoinSnap).not.toHaveBeenCalled();
    });

    it('handles bitcoin_signPsbt by mapping, routing, and normalizing the result', async () => {
      mockedCallBitcoinSnap.mockResolvedValue({
        psbt: 'signed-psbt',
        txid: 'tx-id',
      });

      const result = await bitcoinAdapter.handleRequest({
        connectedAddresses: [`${BtcScope.Mainnet}:bc1qaddrA` as CaipAccountId],
        scope: BtcScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'bitcoin_signPsbt',
        params: {
          account: 'bc1qaddrA',
          psbt: 'base64-psbt',
          signInputs: [{ address: 'bc1qaddrA', index: 0 }],
          broadcast: true,
        },
      });

      expect(mockedCallBitcoinSnap).toHaveBeenCalledWith({
        connectedAddresses: [`${BtcScope.Mainnet}:bc1qaddrA`],
        scope: BtcScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signPsbt',
          params: {
            psbt: 'base64-psbt',
            options: { fill: false, broadcast: true },
          },
        },
      });
      expect(mockedCallBitcoinSnap).toHaveBeenCalledWith(
        expect.not.objectContaining({ origin: expect.anything() }),
      );
      expect(result).toStrictEqual({ psbt: 'signed-psbt', txid: 'tx-id' });
    });

    it('handles bitcoin_signMessage and returns the connected account address', async () => {
      mockedCallBitcoinSnap.mockResolvedValue({ signature: 'hex-signature' });

      const result = await bitcoinAdapter.handleRequest({
        connectedAddresses: [`${BtcScope.Mainnet}:bc1qaddrA` as CaipAccountId],
        scope: BtcScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'bitcoin_signMessage',
        params: { account: 'bc1qaddrA', message: 'hello' },
      });

      expect(mockedCallBitcoinSnap).toHaveBeenCalledWith({
        connectedAddresses: [`${BtcScope.Mainnet}:bc1qaddrA`],
        scope: BtcScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signMessage',
          params: { message: 'hello' },
        },
      });
      expect(result).toStrictEqual({
        address: 'bc1qaddrA',
        signature: 'hex-signature',
      });
    });

    it('rejects unsupported WalletConnect methods', async () => {
      const args = {
        connectedAddresses: [`${BtcScope.Mainnet}:bc1qaddrA` as CaipAccountId],
        scope: BtcScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'bitcoin_unknownMethod',
        params: {},
      };

      await expect(
        // @ts-expect-error - misbehaving client sending an unapproved method
        bitcoinAdapter.handleRequest(args),
      ).rejects.toThrow(
        'WalletConnect Bitcoin method bitcoin_unknownMethod is not supported',
      );

      expect(mockedCallBitcoinSnap).not.toHaveBeenCalled();
    });
  });
});
