import { SolScope } from '@metamask/keyring-api';
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
  solanaAdapter,
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

jest.mock('@solana/transactions', () => ({
  getTransactionDecoder: () => ({
    decode: (bytes: Uint8Array) => ({ __bytes: bytes }),
  }),
  getSignatureFromTransaction: jest.fn(() => 'extracted-base58-signature'),
}));

const mockedGetAccountsFromSelectedAccountGroup = Engine.context
  .AccountTreeController.getAccountsFromSelectedAccountGroup as jest.Mock;
const mockedGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockedGetPermittedCaipChainIds = getPermittedCaipChainIds as jest.Mock;
const mockedCallSolanaSnap = (createSnapCaller as unknown as () => jest.Mock)();
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

describe('multichain/solana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallSolanaSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('enrichCaveatValue', () => {
    it('adds the Solana optional scope when a proposal references Solana', () => {
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
              solana: { chains: [SolScope.Mainnet], methods: [], events: [] },
            },
          },
          caveatValue,
        }),
      ).toStrictEqual({
        ...caveatValue,
        optionalScopes: {
          [SolScope.Mainnet]: { accounts: [] },
        },
      });
    });

    it('falls back to Solana Mainnet when only unsupported Solana scopes are requested', () => {
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
              solana: {
                chains: [SolScope.Devnet],
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
          [SolScope.Mainnet]: { accounts: [] },
        },
      });
    });
  });

  describe('getScopedPermissions', () => {
    it('returns scoped permissions for permitted Solana chains and accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([
        'eip155:1',
        SolScope.Mainnet,
      ]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        'eip155:1:0xabc',
        `${SolScope.Mainnet}:SolAddrA`,
      ]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toStrictEqual({
        chains: [SolScope.Mainnet],
        methods: [
          'solana_getAccounts',
          'solana_requestAccounts',
          'solana_signMessage',
          'solana_signTransaction',
          'solana_signAllTransactions',
          'solana_signAndSendTransaction',
        ],
        events: [],
        accounts: [`${SolScope.Mainnet}:SolAddrA`],
      });
    });

    it('prioritizes selected Solana account ids when building scoped permissions', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([SolScope.Mainnet]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        `${SolScope.Mainnet}:SolAddrA`,
        `${SolScope.Mainnet}:SolAddrB`,
      ]);
      mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([
        { address: 'SolAddrB', scopes: [SolScope.Mainnet] },
      ]);

      const result = await getScopedPermissions({ channelId: 'wc-topic' });

      expect(result?.accounts).toStrictEqual([
        `${SolScope.Mainnet}:SolAddrB`,
        `${SolScope.Mainnet}:SolAddrA`,
      ]);
    });

    it('returns undefined when there are no Solana chains or accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue(['eip155:1']);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();

      mockedGetPermittedCaipChainIds.mockResolvedValue([SolScope.Mainnet]);
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });

    it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([SolScope.Mainnet]);
      mockedGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
      });

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('solanaAdapter', () => {
    it('declares the Solana CAIP namespace and approved methods', () => {
      expect(solanaAdapter.namespace).toBe('solana');
      expect(solanaAdapter.redirectMethods).toStrictEqual([
        'solana_signMessage',
        'solana_signTransaction',
        'solana_signAllTransactions',
        'solana_signAndSendTransaction',
      ]);
      expect(solanaAdapter.approvedMethods).toStrictEqual([
        'solana_getAccounts',
        'solana_requestAccounts',
        'solana_signMessage',
        'solana_signTransaction',
        'solana_signAllTransactions',
        'solana_signAndSendTransaction',
      ]);
      expect(solanaAdapter.getSessionProperties).toBeUndefined();
    });

    it('returns connected accounts for account methods', async () => {
      await expect(
        solanaAdapter.handleRequest({
          origin: 'https://solana.example.com',
          connectedAddresses: [
            `${SolScope.Mainnet}:SolAddrA` as CaipAccountId,
            `${SolScope.Mainnet}:SolAddrB` as CaipAccountId,
          ],
          scope: SolScope.Mainnet as CaipChainId,
          requestId: 1,
          method: 'solana_getAccounts',
          params: undefined,
        }),
      ).resolves.toStrictEqual([
        { pubkey: 'SolAddrA' },
        { pubkey: 'SolAddrB' },
      ]);
    });

    it('handles requests by mapping, routing, and normalizing the result', async () => {
      const snapResult = { signedTransaction: 'signed-tx' };
      mockedCallSolanaSnap.mockResolvedValue(snapResult);

      const result = await solanaAdapter.handleRequest({
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA` as CaipAccountId],
        scope: SolScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'solana_signTransaction',
        params: { transaction: 'serialized-tx' },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledWith({
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA`],
        scope: SolScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            account: { address: 'SolAddrA' },
            transaction: 'serialized-tx',
            scope: SolScope.Mainnet,
          },
        },
      });
      expect(result).toStrictEqual({
        signature: 'extracted-base58-signature',
        transaction: 'signed-tx',
      });
    });

    it('passes the dapp origin to the Snap routing service when provided', async () => {
      const snapResult = { signedTransaction: 'signed-tx' };
      mockedCallSolanaSnap.mockResolvedValue(snapResult);

      await solanaAdapter.handleRequest({
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA` as CaipAccountId],
        scope: SolScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'solana_signTransaction',
        params: { transaction: 'serialized-tx' },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledWith({
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA`],
        scope: SolScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            account: { address: 'SolAddrA' },
            transaction: 'serialized-tx',
            scope: SolScope.Mainnet,
          },
        },
      });
    });

    it('iterates solana_signAllTransactions requests when transactions are provided', async () => {
      mockedCallSolanaSnap
        .mockResolvedValueOnce({ signedTransaction: 'signed-a' })
        .mockResolvedValueOnce({ signedTransaction: 'signed-b' });

      const result = await solanaAdapter.handleRequest({
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA` as CaipAccountId],
        scope: SolScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'solana_signAllTransactions',
        params: { transactions: ['tx-a', 'tx-b'] },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledTimes(2);
      expect(mockedCallSolanaSnap).toHaveBeenNthCalledWith(1, {
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA`],
        scope: SolScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            account: { address: 'SolAddrA' },
            scope: SolScope.Mainnet,
            transaction: 'tx-a',
          },
        },
      });
      expect(mockedCallSolanaSnap).toHaveBeenNthCalledWith(2, {
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA`],
        scope: SolScope.Mainnet,
        requestId: 1,
        request: {
          method: 'signTransaction',
          params: {
            account: { address: 'SolAddrA' },
            scope: SolScope.Mainnet,
            transaction: 'tx-b',
          },
        },
      });
      expect(result).toStrictEqual({
        transactions: ['signed-a', 'signed-b'],
      });
    });

    it('rejects unsupported WalletConnect methods', async () => {
      const args = {
        origin: 'https://solana.example.com',
        connectedAddresses: [`${SolScope.Mainnet}:SolAddrA` as CaipAccountId],
        scope: SolScope.Mainnet as CaipChainId,
        requestId: 1,
        method: 'solana_unknownMethod',
        params: {},
      };

      await expect(
        // @ts-expect-error - misbehaving client sending an unapproved method
        solanaAdapter.handleRequest(args),
      ).rejects.toThrow(
        'WalletConnect Solana method solana_unknownMethod is not supported',
      );

      expect(mockedCallSolanaSnap).not.toHaveBeenCalled();
    });
  });
});
