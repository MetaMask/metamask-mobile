import { StatusTypes } from '@metamask/bridge-controller';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { initialState, evmAccountAddress } from '../../_mocks_/initialState';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';

const buildTransactionState = (
  status: TransactionStatus,
): DeepPartial<RootState> => ({
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      TransactionController: {
        transactions: [
          {
            id: 'tx-id',
            hash: '0xabc',
            status,
            chainId: '0x1',
            networkClientId: 'mainnet',
            time: Date.now(),
            txParams: { from: evmAccountAddress },
          } as TransactionMeta,
        ],
        transactionBatches: [],
      },
    },
  },
});

const buildBridgeHistoryState = (
  status: StatusTypes,
): DeepPartial<RootState> => ({
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      BridgeStatusController: {
        txHistory: {
          'bridge-tx-id': {
            ...initialState.engine.backgroundState.BridgeStatusController
              .txHistory['test-tx-id'],
            txMetaId: 'bridge-tx-id',
            status: {
              srcChain: { txHash: '0xbridge' },
              status,
            },
          },
        },
      },
    },
  },
});

const renderStatus = (
  params: Parameters<typeof usePostTradeTxStatus>[0],
  state: DeepPartial<RootState> = initialState,
) =>
  renderHookWithProvider(() => usePostTradeTxStatus(params), { state }).result
    .current;

describe('usePostTradeTxStatus', () => {
  it('keeps controller errors in failed state', () => {
    expect(
      renderStatus({
        initialStatus: PostTradeStatus.Failed,
      }),
    ).toBe(PostTradeStatus.Failed);
  });

  it.each([
    [TransactionStatus.submitted, PostTradeStatus.InProgress],
    [TransactionStatus.confirmed, PostTradeStatus.Success],
    [TransactionStatus.failed, PostTradeStatus.Failed],
  ])('maps transaction status %s', (transactionStatus, postTradeStatus) => {
    expect(
      renderStatus(
        {
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: 'tx-id',
        },
        buildTransactionState(transactionStatus),
      ),
    ).toBe(postTradeStatus);
  });

  it.each([
    [StatusTypes.COMPLETE, PostTradeStatus.Success],
    [StatusTypes.FAILED, PostTradeStatus.Failed],
  ])('maps bridge history status %s', (bridgeStatus, postTradeStatus) => {
    expect(
      renderStatus(
        {
          initialStatus: PostTradeStatus.InProgress,
          transactionMetaId: 'bridge-tx-id',
          initialTransactionStatus: TransactionStatus.submitted,
        },
        buildBridgeHistoryState(bridgeStatus),
      ),
    ).toBe(postTradeStatus);
  });
});
