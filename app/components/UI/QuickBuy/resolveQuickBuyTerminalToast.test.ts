import { StatusTypes } from '@metamask/bridge-controller';
import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
import {
  playErrorNotification,
  playSuccessNotification,
} from '../../../util/haptics';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import {
  clearSettledQuickBuyTrades,
  detachQuickBuyTradeStateCallback,
  getTrackedQuickBuyTradeIds,
  isQuickBuyTransaction,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from './resolveQuickBuyTerminalToast';

jest.mock('./quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('../../../util/haptics', () => ({
  playSuccessNotification: jest.fn(),
  playErrorNotification: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeStatusController: {
        getBridgeHistoryItemByTxMetaId: jest.fn(),
      },
      MultichainTransactionsController: {
        state: { nonEvmTransactions: {} },
      },
    },
  },
}));

const mockGetHistoryItem = Engine.context.BridgeStatusController
  .getBridgeHistoryItemByTxMetaId as jest.Mock;

const setMultichainTransaction = (
  id: string,
  status: KeyringTransactionStatus,
) => {
  Engine.context.MultichainTransactionsController.state.nonEvmTransactions = {
    'account-1': {
      'solana:mainnet': {
        transactions: [{ id, status }],
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const theme = { colors: {} } as unknown as Parameters<
  typeof resolveQuickBuyTerminalToast
>[2];

const historyItemWithStatus = (status: StatusTypes) => ({
  status: { status },
});

const buyTrade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'PEPE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$50.00',
  rate: '1 USDC = 1,000 PEPE',
};

const solanaTrade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'BONK',
  counterTokenSymbol: 'SOL',
  fiatAmountLabel: '$30.00',
  isNonEvmSwap: true,
  txSignature: 'sig-1',
};

describe('resolveQuickBuyTerminalToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
    clearSettledQuickBuyTrades();
    Engine.context.MultichainTransactionsController.state.nonEvmTransactions =
      {};
  });

  it('shows the complete toast, plays success haptic, and untracks on COMPLETE', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(result).toBe(true);
    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('complete', {
      trade: buyTrade,
      theme,
    });
    expect(showToast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('shows the failed toast, plays error haptic, and untracks on FAILED', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.FAILED),
    );
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(result).toBe(true);
    expect(showToast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('does nothing and keeps tracking while the swap is still pending', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(result).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });

  it.each([StatusTypes.COMPLETE, StatusTypes.FAILED])(
    'delivers one terminal host event for the selected trade on %s',
    (status) => {
      const onTradeStateChange = jest.fn();
      const unrelatedCallback = jest.fn();
      trackQuickBuyTrade('funding-1', { ...buyTrade, onTradeStateChange });
      trackQuickBuyTrade('unrelated', {
        ...buyTrade,
        onTradeStateChange: unrelatedCallback,
      });
      mockGetHistoryItem.mockReturnValue(
        historyItemWithStatus(StatusTypes.PENDING),
      );

      resolveQuickBuyTerminalToast('funding-1', jest.fn(), theme);
      expect(onTradeStateChange).not.toHaveBeenCalled();
      mockGetHistoryItem.mockReturnValue(historyItemWithStatus(status));
      resolveQuickBuyTerminalToast('funding-1', undefined, theme);
      resolveQuickBuyTerminalToast('funding-1', undefined, theme);

      expect(onTradeStateChange).toHaveBeenCalledTimes(1);
      expect(onTradeStateChange).toHaveBeenCalledWith({
        status: status === StatusTypes.COMPLETE ? 'complete' : 'failed',
        transactionId: 'funding-1',
      });
      expect(unrelatedCallback).not.toHaveBeenCalled();
    },
  );

  it('delivers completion for a confirmed same-chain Solana trade', () => {
    const onTradeStateChange = jest.fn();
    trackQuickBuyTrade('solana-1', { ...solanaTrade, onTradeStateChange });
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Confirmed);

    resolveQuickBuyTerminalToast('solana-1', undefined, theme);

    expect(onTradeStateChange).toHaveBeenCalledWith({
      status: 'complete',
      transactionId: 'solana-1',
    });
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('still shows settlement after the host abandons its funding intent', () => {
    const onTradeStateChange = jest.fn();
    const showToast = jest.fn();
    trackQuickBuyTrade('funding-1', { ...buyTrade, onTradeStateChange });
    detachQuickBuyTradeStateCallback('funding-1');
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );

    resolveQuickBuyTerminalToast('funding-1', showToast, theme);

    expect(onTradeStateChange).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('returns false without reading history when the id is not tracked', () => {
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('missing', showToast, theme);

    expect(result).toBe(false);
    expect(mockGetHistoryItem).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('fires only once for the same trade across concurrent terminal resolves', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    const first = resolveQuickBuyTerminalToast('tx-1', showToast, theme);
    const second = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('keeps the trade recognised as QuickBuy after settling so the delayed generic toast stays suppressed', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );

    resolveQuickBuyTerminalToast('tx-1', jest.fn(), theme);

    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
    expect(
      isQuickBuyTransaction({
        id: 'tx-1',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    ).toBe(true);
  });

  it('resolves a Solana swap to complete from the multichain controller when bridge status is absent', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Confirmed);
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('sig-1', showToast, theme);

    expect(result).toBe(true);
    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('complete', {
      trade: solanaTrade,
      theme,
    });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('resolves a Solana swap to failed from the multichain controller', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Failed);
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('sig-1', showToast, theme);

    expect(result).toBe(true);
    expect(showToast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('keeps tracking a Solana swap whose multichain tx is not yet terminal', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Submitted);
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('sig-1', showToast, theme);

    expect(result).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['sig-1']);
  });

  it('keeps tracking a Solana swap with no matching multichain tx yet', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('sig-1', showToast, theme);

    expect(result).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['sig-1']);
  });

  it('does not read the multichain controller for a non-Solana trade', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    setMultichainTransaction('tx-1', KeyringTransactionStatus.Confirmed);
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(result).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });
});
