import { StatusTypes } from '@metamask/bridge-controller';
import { toast } from '@metamask/design-system-react-native';
import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
import {
  playErrorNotification,
  playSuccessNotification,
} from '../../../util/haptics';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import {
  clearSettledQuickBuyTrades,
  getTrackedQuickBuyTradeIds,
  isQuickBuyTransaction,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from './resolveQuickBuyTerminalToast';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

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
    const result = resolveQuickBuyTerminalToast('tx-1');

    expect(result).toBe(true);
    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith(
      'complete',
      buyTrade,
    );
    expect(toast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('shows the failed toast, plays error haptic, and untracks on FAILED', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.FAILED),
    );
    const result = resolveQuickBuyTerminalToast('tx-1');

    expect(result).toBe(true);
    expect(toast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('does nothing and keeps tracking while the swap is still pending', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    const result = resolveQuickBuyTerminalToast('tx-1');

    expect(result).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });

  it('returns false without reading history when the id is not tracked', () => {
    const result = resolveQuickBuyTerminalToast('missing');

    expect(result).toBe(false);
    expect(mockGetHistoryItem).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('fires only once for the same trade across concurrent terminal resolves', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const first = resolveQuickBuyTerminalToast('tx-1');
    const second = resolveQuickBuyTerminalToast('tx-1');

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('keeps the trade recognised as QuickBuy after settling so the delayed generic toast stays suppressed', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );

    resolveQuickBuyTerminalToast('tx-1');

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
    const result = resolveQuickBuyTerminalToast('sig-1');

    expect(result).toBe(true);
    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith(
      'complete',
      solanaTrade,
    );
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('resolves a Solana swap to failed from the multichain controller', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Failed);
    const result = resolveQuickBuyTerminalToast('sig-1');

    expect(result).toBe(true);
    expect(toast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('keeps tracking a Solana swap whose multichain tx is not yet terminal', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Submitted);
    const result = resolveQuickBuyTerminalToast('sig-1');

    expect(result).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['sig-1']);
  });

  it('keeps tracking a Solana swap with no matching multichain tx yet', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    const result = resolveQuickBuyTerminalToast('sig-1');

    expect(result).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['sig-1']);
  });

  it('does not read the multichain controller for a non-Solana trade', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    setMultichainTransaction('tx-1', KeyringTransactionStatus.Confirmed);
    const result = resolveQuickBuyTerminalToast('tx-1');

    expect(result).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });
});
