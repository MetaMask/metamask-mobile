import { renderHook } from '@testing-library/react-native';
import { StatusTypes as BridgeStatus } from '@metamask/bridge-controller';
import {
  SolScope,
  TransactionStatus as KeyringTransactionStatus,
} from '@metamask/keyring-api';
import { TransactionStatus as TxStatus } from '@metamask/transaction-controller';
import { PostTradeStatus as Status } from './PostTradeBottomSheet.types';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';

const SOLANA_MAINNET_CHAIN_ID = 1151111081099710;

let mockTransactionMeta: { status?: TxStatus; hash?: string } | undefined;
let mockBridgeHistory = {};
let mockNonEvmTransactions: unknown = {};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));
jest.mock('../../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: () => mockTransactionMeta,
}));
jest.mock('../../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => mockBridgeHistory,
}));
jest.mock('../../../../../selectors/multichain/multichain', () => ({
  selectMultichainTransactions: () => mockNonEvmTransactions,
}));

const statusOf = (
  txStatus?: TxStatus,
  bridgeStatus?: BridgeStatus,
  {
    isBridge = false,
    metaHash,
    srcChainId,
    destChainId,
    statusSrcTxHash,
    statusDestTxHash,
    transactionHash,
    nonEvmTransactions = {},
  }: {
    isBridge?: boolean;
    metaHash?: string;
    srcChainId?: number;
    destChainId?: number;
    statusSrcTxHash?: string;
    statusDestTxHash?: string;
    transactionHash?: string;
    nonEvmTransactions?: unknown;
  } = {},
) => {
  mockTransactionMeta =
    txStatus || metaHash !== undefined
      ? { status: txStatus, hash: metaHash }
      : undefined;
  mockBridgeHistory =
    bridgeStatus !== undefined
      ? {
          'tx-id': {
            quote: {
              srcChainId: srcChainId ?? 1,
              destChainId: destChainId ?? 1,
            },
            status: {
              status: bridgeStatus,
              srcChain: { txHash: statusSrcTxHash },
              destChain: { txHash: statusDestTxHash },
            },
          },
        }
      : {};
  mockNonEvmTransactions = nonEvmTransactions;

  const params = {
    initialStatus: Status.InProgress,
    isBridge,
    transactionMetaId: 'tx-id',
    transactionHash,
  };
  return renderHook(() => usePostTradeTxStatus(params)).result.current;
};

const solanaTx = (status: KeyringTransactionStatus, id = 'sol-sig') => ({
  'account-1': {
    [SolScope.Mainnet]: {
      transactions: [{ id, status }],
    },
  },
});

describe('usePostTradeTxStatus', () => {
  it('maps transaction and bridge statuses', () => {
    expect(statusOf(TxStatus.confirmed)).toBe(Status.Success);
    expect(statusOf(TxStatus.confirmed, BridgeStatus.UNKNOWN)).toBe(
      Status.Success,
    );
    expect(
      statusOf(TxStatus.confirmed, BridgeStatus.UNKNOWN, {
        isBridge: true,
        srcChainId: 1,
        destChainId: 10,
      }),
    ).toBe(Status.InProgress);
    expect(statusOf(TxStatus.failed)).toBe(Status.Failed);
    expect(statusOf(undefined, BridgeStatus.COMPLETE)).toBe(Status.Success);
    expect(statusOf(undefined, BridgeStatus.FAILED)).toBe(Status.Failed);
    expect(statusOf(undefined, BridgeStatus.UNKNOWN)).toBe(Status.InProgress);
  });

  it('resolves same-chain Solana swaps from multichain transactions', () => {
    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: SOLANA_MAINNET_CHAIN_ID,
        transactionHash: 'sol-sig',
        nonEvmTransactions: solanaTx(KeyringTransactionStatus.Confirmed),
      }),
    ).toBe(Status.Success);

    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        metaHash: '',
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: SOLANA_MAINNET_CHAIN_ID,
        transactionHash: 'sol-sig',
        nonEvmTransactions: solanaTx(KeyringTransactionStatus.Confirmed),
      }),
    ).toBe(Status.Success);

    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: SOLANA_MAINNET_CHAIN_ID,
        transactionHash: 'sol-sig',
        nonEvmTransactions: solanaTx(KeyringTransactionStatus.Failed),
      }),
    ).toBe(Status.Failed);

    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        isBridge: true,
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: 1,
        transactionHash: 'sol-sig',
        nonEvmTransactions: solanaTx(KeyringTransactionStatus.Confirmed),
      }),
    ).toBe(Status.InProgress);

    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: SOLANA_MAINNET_CHAIN_ID,
        statusSrcTxHash: 'sol-sig',
        nonEvmTransactions: solanaTx(KeyringTransactionStatus.Confirmed),
      }),
    ).toBe(Status.Success);

    expect(
      statusOf(undefined, BridgeStatus.UNKNOWN, {
        srcChainId: SOLANA_MAINNET_CHAIN_ID,
        destChainId: SOLANA_MAINNET_CHAIN_ID,
        nonEvmTransactions: solanaTx(
          KeyringTransactionStatus.Confirmed,
          'tx-id',
        ),
      }),
    ).toBe(Status.Success);
  });

  describe('cross-chain bridge completion', () => {
    it('stays in progress when a bridge reports COMPLETE without a destination tx hash', () => {
      expect(
        statusOf(TxStatus.confirmed, BridgeStatus.COMPLETE, {
          isBridge: true,
          srcChainId: 1,
          destChainId: SOLANA_MAINNET_CHAIN_ID,
          statusSrcTxHash: '0xsrc',
        }),
      ).toBe(Status.InProgress);
    });

    it('shows success when a bridge reports COMPLETE with a destination tx hash', () => {
      expect(
        statusOf(TxStatus.confirmed, BridgeStatus.COMPLETE, {
          isBridge: true,
          srcChainId: 1,
          destChainId: SOLANA_MAINNET_CHAIN_ID,
          statusSrcTxHash: '0xsrc',
          statusDestTxHash: 'sol-dest-sig',
        }),
      ).toBe(Status.Success);
    });

    it('treats a cross-chain quote as a bridge even when isBridge is not passed', () => {
      // Source EVM tx is confirmed but the destination (Solana) has not settled.
      // Without deriving `isBridge` from the quote, this would flip to success.
      expect(
        statusOf(TxStatus.confirmed, BridgeStatus.UNKNOWN, {
          isBridge: false,
          srcChainId: 1,
          destChainId: SOLANA_MAINNET_CHAIN_ID,
          statusSrcTxHash: '0xsrc',
        }),
      ).toBe(Status.InProgress);
    });

    it('does not show premature success on COMPLETE for a cross-chain quote even when isBridge is not passed', () => {
      expect(
        statusOf(TxStatus.confirmed, BridgeStatus.COMPLETE, {
          isBridge: false,
          srcChainId: 1,
          destChainId: SOLANA_MAINNET_CHAIN_ID,
          statusSrcTxHash: '0xsrc',
        }),
      ).toBe(Status.InProgress);
    });
  });
});
