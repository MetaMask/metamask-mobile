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
      PermissionController: { getCaveat: jest.fn() },
    },
  },
}));

jest.mock('../../../Permissions', () => ({
  getPermittedCaipChainIds: jest.fn(),
}));

jest.mock('../router', () => {
  const snapCallerMock = jest.fn();
  return { createSnapCaller: () => snapCallerMock };
});

jest.mock('../../../SDKConnect/utils/DevLogger', () => ({ log: jest.fn() }));

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

const REDIRECT_METHODS = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendTransaction',
];
const APPROVED_METHODS = [
  'solana_getAccounts',
  'solana_requestAccounts',
  ...REDIRECT_METHODS,
];

const EMPTY_CAVEAT_VALUE = {
  requiredScopes: {},
  optionalScopes: {},
  isMultichainOrigin: true,
  sessionProperties: {},
} as Caip25CaveatValue;

const solanaNamespace = (chains: CaipChainId[]) => ({
  solana: { chains, methods: [], events: [] },
});

const BASE_REQUEST = {
  origin: 'channelId',
  originMetadata: MOCK_ORIGIN_METADATA,
  connectedAddresses: [SOLANA_ACCOUNT],
  scope: SOLANA_MAINNET,
  requestId: 1,
};

describe('multichain/solana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAccountsFromSelectedAccountGroup.mockReturnValue([]);
    mockedGetCaveat.mockReturnValue(undefined);
    mockedGetPermittedCaipChainIds.mockResolvedValue([]);
    mockedCallSolanaSnap.mockResolvedValue(undefined);
    mockedGetCaipAccountIdsFromCaip25CaveatValue.mockReturnValue([]);
  });

  describe('chain id normalization', () => {
    it.each([
      [
        'the legacy mainnet genesis hash',
        SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID,
        SOLANA_MAINNET,
      ],
      ['a current Solana chain id', SOLANA_MAINNET, SOLANA_MAINNET],
      ['a non-Solana chain id', 'eip155:1' as CaipChainId, 'eip155:1'],
    ])('maps %s inbound', (_label, input, expected) => {
      expect(normalizeCaipChainIdInbound(input)).toBe(expected);
    });

    it('leaves Solana genesis-hash chain ids unchanged outbound', () => {
      expect(normalizeCaipChainIdOutbound(SOLANA_MAINNET)).toBe(SOLANA_MAINNET);
    });
  });

  describe('enrichCaveatValue', () => {
    it.each([
      [
        'an optional Solana namespace',
        {
          requiredNamespaces: {},
          optionalNamespaces: solanaNamespace([SOLANA_MAINNET]),
        },
      ],
      [
        'the legacy genesis hash in required namespaces',
        {
          requiredNamespaces: solanaNamespace([
            SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID,
          ]),
          optionalNamespaces: {},
        },
      ],
    ])('seeds the Mainnet optional scope from %s', (_label, proposal) => {
      expect(
        enrichCaveatValue({ proposal, caveatValue: EMPTY_CAVEAT_VALUE }),
      ).toStrictEqual({
        ...EMPTY_CAVEAT_VALUE,
        optionalScopes: { [SOLANA_MAINNET]: { accounts: [] } },
      });
    });
  });

  describe('getSessionProperties', () => {
    it('advertises account-changed notifications for Solana proposals', () => {
      expect(
        getSessionProperties({
          proposal: {
            requiredNamespaces: {},
            optionalNamespaces: solanaNamespace([SOLANA_MAINNET]),
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
        methods: APPROVED_METHODS,
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
      expect(solanaAdapter.approvedMethods).toStrictEqual(APPROVED_METHODS);
      expect(solanaAdapter.redirectMethods).toStrictEqual(REDIRECT_METHODS);
      expect(solanaAdapter.getSessionProperties).toBe(getSessionProperties);
    });

    it('handles solana_signMessage by mapping, routing, and normalizing', async () => {
      mockedCallSolanaSnap.mockResolvedValue({ signature: 'sig' });

      const result = await solanaAdapter.handleRequest({
        ...BASE_REQUEST,
        method: 'solana_signMessage',
        params: {
          pubkey: 'AddrA',
          message: base58.encode(Buffer.from('hello', 'utf8')),
        },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledWith({
        ...BASE_REQUEST,
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

    it('handles solana_signAndSendTransaction with confirmed preflight', async () => {
      mockedCallSolanaSnap.mockResolvedValue({ signature: 'txid' });

      const result = await solanaAdapter.handleRequest({
        ...BASE_REQUEST,
        method: 'solana_signAndSendTransaction',
        params: { pubkey: 'AddrA', transaction: 'base64tx' },
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
        ...BASE_REQUEST,
        requestId: 10,
        method: 'solana_signAllTransactions',
        params: { transactions: ['tx-a', 'tx-b'] },
      });

      expect(mockedCallSolanaSnap).toHaveBeenCalledTimes(2);
      expect(mockedCallSolanaSnap).toHaveBeenLastCalledWith(
        expect.objectContaining({ requestId: 11 }),
      );
      expect(result).toStrictEqual({ transactions: ['signed-a', 'signed-b'] });
    });

    it('returns session accounts for solana_getAccounts without calling the snap', async () => {
      const result = await solanaAdapter.handleRequest({
        ...BASE_REQUEST,
        method: 'solana_getAccounts',
        params: {},
      });

      expect(mockedCallSolanaSnap).not.toHaveBeenCalled();
      expect(result).toStrictEqual([{ pubkey: 'AddrA' }]);
    });

    it('rejects unsupported WalletConnect methods', async () => {
      await expect(
        solanaAdapter.handleRequest({
          ...BASE_REQUEST,
          // @ts-expect-error - misbehaving client sending an unapproved method
          method: 'solana_unknownMethod',
          params: {},
        }),
      ).rejects.toThrow(
        'WalletConnect Solana method solana_unknownMethod is not supported',
      );

      expect(mockedCallSolanaSnap).not.toHaveBeenCalled();
    });
  });
});
