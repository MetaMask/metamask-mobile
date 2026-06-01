import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
import {
  initialState,
  evmAccountAddress,
} from '../../_mocks_/initialState';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { StatusTypes } from '@metamask/bridge-controller';

const buildStateWithTransaction = (transaction: TransactionMeta) => ({
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      TransactionController: {
        transactions: [transaction],
        transactionBatches: [],
      },
    },
  },
});

const buildTransaction = (
  status: TransactionStatus,
  id = 'tx-id',
): TransactionMeta =>
  ({
    id,
    hash: '0xabc',
    status,
    chainId: '0x1',
    networkClientId: 'mainnet',
    time: Date.now(),
    txParams: {
      from: evmAccountAddress,
    },
  }) as TransactionMeta;

describe('usePostTradeTxStatus', () => {
  it('returns failed immediately when initial status is failed', () => {
    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.Failed,
        }),
      { state: initialState },
    );

    expect(result.current).toBe(PostTradeStatus.Failed);
  });

  it('returns in progress while the submitted transaction is pending', () => {
    const transaction = buildTransaction(TransactionStatus.submitted);
    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: transaction.id,
        }),
      { state: buildStateWithTransaction(transaction) },
    );

    expect(result.current).toBe(PostTradeStatus.InProgress);
  });

  it('returns success when a same-chain swap transaction is confirmed', () => {
    const transaction = buildTransaction(TransactionStatus.confirmed);
    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: transaction.id,
        }),
      { state: buildStateWithTransaction(transaction) },
    );

    expect(result.current).toBe(PostTradeStatus.Success);
  });

  it('returns failed when the transaction reaches a failed final status', () => {
    const transaction = buildTransaction(TransactionStatus.failed);
    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: transaction.id,
        }),
      { state: buildStateWithTransaction(transaction) },
    );

    expect(result.current).toBe(PostTradeStatus.Failed);
  });

  it('returns success when bridge history is complete', () => {
    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: 'test-tx-id',
          initialTransactionStatus: TransactionStatus.submitted,
        }),
      { state: initialState },
    );

    expect(result.current).toBe(PostTradeStatus.Success);
  });

  it('returns failed when bridge history fails', () => {
    const failedBridgeHistoryState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              'failed-bridge-tx': {
                txMetaId: 'failed-bridge-tx',
                account: evmAccountAddress,
                quote: {
                  requestId: 'request-id',
                  srcChainId: 1,
                  destChainId: 10,
                  srcAsset: {
                    chainId: 1,
                    address: '0x123',
                    decimals: 18,
                    symbol: 'ETH',
                    name: 'Ether',
                  },
                  destAsset: {
                    chainId: 10,
                    address: '0x456',
                    decimals: 6,
                    symbol: 'USDC',
                    name: 'USDC',
                  },
                  srcTokenAmount: '1000000000000000000',
                  destTokenAmount: '1000000',
                },
                status: {
                  srcChain: {
                    txHash: '0xfailed',
                  },
                  status: StatusTypes.FAILED,
                },
                startTime: Date.now(),
                estimatedProcessingTimeInSeconds: 60,
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(
      () =>
        usePostTradeTxStatus({
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: 'failed-bridge-tx',
          initialTransactionStatus: TransactionStatus.submitted,
        }),
      { state: failedBridgeHistoryState },
    );

    expect(result.current).toBe(PostTradeStatus.Failed);
  });
});

