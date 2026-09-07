import {
  getCaipAccountIdsFromCaip25CaveatValue,
  type Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';
import type { CaipAccountId, CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { base58 } from 'ethers/lib/utils';

import Engine from '../../../Engine';
import { getPermittedCaipChainIds } from '../../../Permissions';
import { createSnapCaller } from '../router';
import {
  enrichCaveatValue,
  getScopedPermissions,
  getSessionProperties,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID,
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

const mockedGetAccountsFromSelectedAccountGroup = Engine.context
  .AccountTreeController.getAccountsFromSelectedAccountGroup as jest.Mock;
const mockedGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockedGetPermittedCaipChainIds = getPermittedCaipChainIds as jest.Mock;
const mockedCallSolanaSnap = (createSnapCaller as unknown as () => jest.Mock)();
const mockedGetCaipAccountIdsFromCaip25CaveatValue =
  getCaipAccountIdsFromCaip25CaveatValue as jest.Mock;

const MOCK_ORIGIN_METADATA = {
  transport: 'WalletConnect',
  selfReportedOrigin: 'https://jup.ag',
};

const SOLANA_MAINNET = SolScope.Mainnet as CaipChainId;
const SOLANA_ACCOUNT = `${SOLANA_MAINNET}:AddrA` as CaipAccountId;

describe('multichain/solana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallSolanaSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('normalizeCaipChainIdInbound', () => {
    it('maps the legacy WalletConnect mainnet genesis hash to SolScope.Mainnet', () => {
      expect(
        normalizeCaipChainIdInbound(SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID),
      ).toBe(SOLANA_MAINNET);
    });

    it('passes current Solana CAIP chain ids through unchanged', () => {
      expect(normalizeCaipChainIdInbound(SOLANA_MAINNET)).toBe(SOLANA_MAINNET);
    });

    it('passes non-Solana CAIP chain ids through unchanged', () => {
      expect(normalizeCaipChainIdInbound('eip155:1')).toBe('eip155:1');
    });
  });

  describe('normalizeCaipChainIdOutbound', () => {
    it('leaves Solana genesis-hash chain ids unchanged', () => {
      expect(normalizeCaipChainIdOutbound(SOLANA_MAINNET)).toBe(SOLANA_MAINNET);
    });
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
              solana: {
                chains: [SOLANA_MAINNET],
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
          [SOLANA_MAINNET]: { accounts: [] },
        },
      });
    });

    it('falls back to Mainnet for the legacy WalletConnect genesis hash', () => {
      const caveatValue = {
        requiredScopes: {},
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      } as Caip25CaveatValue;

      expect(
        enrichCaveatValue({
          proposal: {
            requiredNamespaces: {
              solana: {
                chains: [SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID],
                methods: [],
                events: [],
              },
            },
            optionalNamespaces: {},
          },
          caveatValue,
        }),
      ).toStrictEqual({
        ...caveatValue,
        optionalScopes: {
          [SOLANA_MAINNET]: { accounts: [] },
        },
      });
    });
  });

  describe('getSessionProperties', () => {
    it('advertises solana account-changed notifications when the proposal references Solana', () => {
      expect(
        getSessionProperties({
          proposal: {
            requiredNamespaces: {},
            optionalNamespaces: {
              solana: {
                chains: [SOLANA_MAINNET],
                methods: [],
                events: [],
              },
            },
          },
        }),
      ).toStrictEqual({ solana_accountChanged_notifications: 'true' });
    });

    it('returns undefined when the proposal does not reference Solana', () => {
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
    it('returns scoped permissions for permitted Solana chains and accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([
        'eip155:1',
        SOLANA_MAINNET,
      ]);
      mockedGetCaveat.mockReturnValue({ value: {} });
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([
        'eip155:1:0xabc',
        SOLANA_ACCOUNT,
      ]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toStrictEqual({
        chains: [SOLANA_MAINNET],
        methods: [
          'solana_getAccounts',
          'solana_requestAccounts',
          'solana_signMessage',
          'solana_signTransaction',
          'solana_signAllTransactions',
          'solana_signAndSendTransaction',
        ],
        events: ['accountsChanged'],
        accounts: [SOLANA_ACCOUNT],
      });
    });

    it('returns undefined when there are no Solana chains or accounts', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue(['eip155:1']);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();

      mockedGetPermittedCaipChainIds.mockResolvedValue([SOLANA_MAINNET]);
      mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);

      await expect(
        getScopedPermissions({ channelId: 'wc-topic' }),
      ).resolves.toBeUndefined();
    });

    it('continues when getCaveat throws PermissionDoesNotExistError', async () => {
      mockedGetPermittedCaipChainIds.mockResolvedValue([SOLANA_MAINNET]);
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
      expect(solanaAdapter.getSessionProperties).toBe(getSessionProperties);
    });

    it('handles solana_signMessage by mapping, routing, and normalizing the result', async () => {
      mockedCallSolanaSnap.mockResolvedValue({
        signature: 'sig',
      });
      const encoded = base58.encode(Buffer.from('hello', 'utf8'));

      const result = await solanaAdapter.handleRequest({
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [SOLANA_ACCOUNT],
        scope: SOLANA_MAINNET,
        requestId: 1,
        method: 'solana_signMessage',
        params: {
          pubkey: 'AddrA',
          message: encoded,
        },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledWith({
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [SOLANA_ACCOUNT],
        scope: SOLANA_MAINNET,
        requestId: 1,
        request: {
          method: 'signMessage',
          params: {
            account: { address: 'AddrA' },
            message: Buffer.from('hello', 'utf8').toString('base64'),
          },
        },
      });
      expect(result).toStrictEqual({ signature: 'sig' });
    });

    it('handles solana_signAndSendTransaction with confirmed preflight by default', async () => {
      mockedCallSolanaSnap.mockResolvedValue({
        signature: 'txid',
      });

      const result = await solanaAdapter.handleRequest({
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [SOLANA_ACCOUNT],
        scope: SOLANA_MAINNET,
        requestId: 1,
        method: 'solana_signAndSendTransaction',
        params: {
          pubkey: 'AddrA',
          transaction: 'base64tx',
        },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledWith(
        expect.objectContaining({
          request: {
            method: 'signAndSendTransaction',
            params: {
              account: { address: 'AddrA' },
              transaction: 'base64tx',
              options: { preflightCommitment: 'confirmed' },
            },
          },
        }),
      );
      expect(result).toStrictEqual({ signature: 'txid' });
    });

    it('handles solana_signAllTransactions by signing each transaction', async () => {
      mockedCallSolanaSnap
        .mockResolvedValueOnce({ transaction: 'signed-a' })
        .mockResolvedValueOnce({ transaction: 'signed-b' });

      const result = await solanaAdapter.handleRequest({
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [SOLANA_ACCOUNT],
        scope: SOLANA_MAINNET,
        requestId: 10,
        method: 'solana_signAllTransactions',
        params: {
          transactions: ['tx-a', 'tx-b'],
        },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledTimes(2);
      expect(result).toStrictEqual({
        transactions: ['signed-a', 'signed-b'],
      });
    });

    it('returns session accounts for solana_getAccounts without calling the snap', async () => {
      const result = await solanaAdapter.handleRequest({
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [SOLANA_ACCOUNT],
        scope: SOLANA_MAINNET,
        requestId: 1,
        method: 'solana_getAccounts',
        params: {},
      });

      expect(mockedCallSolanaSnap).not.toHaveBeenCalled();
      expect(result).toStrictEqual([{ pubkey: 'AddrA' }]);
    });

    it('rejects unsupported WalletConnect methods', async () => {
      const args = {
        origin: 'channelId',
        originMetadata: MOCK_ORIGIN_METADATA,
        connectedAddresses: [] as CaipAccountId[],
        scope: SOLANA_MAINNET,
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
