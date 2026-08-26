import { StatusTypes } from '@metamask/bridge-controller';
import { toast } from '@metamask/design-system-react-native';
import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import {
  playErrorNotification,
  playSuccessNotification,
} from '../../../../util/haptics';
import { buildQuickBuyToastOptions } from '../quickBuyToastOptions';
import {
  clearSettledQuickBuyTrades,
  getTrackedQuickBuyTradeIds,
  isQuickBuyTransaction,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from '../quickBuyTradeTracker';
import { registerNotificationSkipPredicate } from '../../../../core/notificationSkipPredicates';
import { useQuickBuyToastRegistrations } from './useQuickBuyToastRegistrations';

jest.mock('../../../../core/notificationSkipPredicates', () => ({
  __esModule: true,
  registerNotificationSkipPredicate: jest.fn(() => jest.fn()),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('../../../../util/haptics', () => ({
  playSuccessNotification: jest.fn(),
  playErrorNotification: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
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

const sellTrade: TrackedQuickBuyTrade = {
  tradeMode: 'sell',
  tokenSymbol: 'DOGE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$25.00',
};

const solanaTrade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'BONK',
  counterTokenSymbol: 'SOL',
  fiatAmountLabel: '$30.00',
  isNonEvmSwap: true,
  txSignature: 'sig-1',
};

const renderHandler = () => {
  const { result } = renderHook(() => useQuickBuyToastRegistrations());
  return result.current[0];
};

describe('useQuickBuyToastRegistrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
    clearSettledQuickBuyTrades();
    Engine.context.MultichainTransactionsController.state.nonEvmTransactions =
      {};
  });

  it('registers the QuickBuy notification skip predicate on mount and unregisters on unmount', () => {
    const unregister = jest.fn();
    (registerNotificationSkipPredicate as jest.Mock).mockReturnValue(
      unregister,
    );

    const { unmount } = renderHook(() => useQuickBuyToastRegistrations());

    expect(registerNotificationSkipPredicate).toHaveBeenCalledWith(
      isQuickBuyTransaction,
    );
    expect(unregister).not.toHaveBeenCalled();

    unmount();

    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('subscribes to both the bridge and multichain state change events', () => {
    const { result } = renderHook(() => useQuickBuyToastRegistrations());

    expect(result.current.map((r) => r.eventName)).toEqual([
      'BridgeStatusController:stateChange',
      'MultichainTransactionsController:stateChange',
    ]);
  });

  it('shows a complete toast and untracks the trade when the swap completes', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    renderHandler().handler({}, jest.fn());

    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith(
      'complete',
      buyTrade,
    );
    expect(toast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(playErrorNotification).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('shows a failed toast and untracks the trade when the swap fails', () => {
    trackQuickBuyTrade('tx-1', sellTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.FAILED),
    );
    renderHandler().handler({}, jest.fn());

    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('failed', sellTrade);
    expect(toast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(playSuccessNotification).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('ignores trades that are still pending', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    renderHandler().handler({}, jest.fn());

    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });

  it('does nothing when there are no tracked trades', () => {
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    renderHandler().handler({}, jest.fn());

    expect(mockGetHistoryItem).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('dedupes repeated state changes for the same terminal status', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const registration = renderHandler();
    registration.handler({}, jest.fn());
    registration.handler({}, jest.fn());

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('resolves a Solana swap from the multichain controller when bridge status is not terminal', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Confirmed);
    const { result } = renderHook(() => useQuickBuyToastRegistrations());
    result.current[1].handler({}, jest.fn());

    expect(toast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('shows a failed toast for a Solana swap that fails on-chain', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Failed);
    renderHandler().handler({}, jest.fn());

    expect(toast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('keeps tracking a Solana swap that has not yet confirmed', () => {
    trackQuickBuyTrade('sig-1', solanaTrade);
    mockGetHistoryItem.mockReturnValue(undefined);
    setMultichainTransaction('sig-1', KeyringTransactionStatus.Submitted);
    renderHandler().handler({}, jest.fn());

    expect(toast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['sig-1']);
  });
});
