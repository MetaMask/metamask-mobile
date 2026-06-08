import { renderHook } from '@testing-library/react-native';
import { StatusTypes } from '@metamask/bridge-controller';
import { useQuickBuyToastRegistrations } from './useQuickBuyToastRegistrations';
import {
  getTrackedQuickBuyTradeIds,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from '../quickBuyTradeTracker';
import { buildQuickBuyToastOptions } from '../quickBuyToastOptions';
import Engine from '../../../../../../../core/Engine';
import {
  playSuccessNotification,
  playErrorNotification,
} from '../../../../../../../util/haptics';

jest.mock('../quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('../../../../../../../util/haptics', () => ({
  playSuccessNotification: jest.fn(),
  playErrorNotification: jest.fn(),
}));

jest.mock('../../../../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      success: { default: 'green' },
      error: { default: 'red' },
    },
  }),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeStatusController: {
        getBridgeHistoryItemByTxMetaId: jest.fn(),
      },
    },
  },
}));

const mockGetHistoryItem = Engine.context.BridgeStatusController
  .getBridgeHistoryItemByTxMetaId as jest.Mock;

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

const renderHandler = () => {
  const { result } = renderHook(() => useQuickBuyToastRegistrations());
  return result.current[0];
};

describe('useQuickBuyToastRegistrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
  });

  it('subscribes to the BridgeStatusController state change event', () => {
    const registration = renderHandler();

    expect(registration.eventName).toBe('BridgeStatusController:stateChange');
  });

  it('shows a complete toast and untracks the trade when the swap completes', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    renderHandler().handler({}, showToast);

    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('complete', {
      trade: buyTrade,
      theme: expect.any(Object),
    });
    expect(showToast).toHaveBeenCalledWith({ kind: 'complete' });
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(playErrorNotification).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('shows a failed toast and untracks the trade when the swap fails', () => {
    trackQuickBuyTrade('tx-1', sellTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.FAILED),
    );
    const showToast = jest.fn();

    renderHandler().handler({}, showToast);

    expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('failed', {
      trade: sellTrade,
      theme: expect.any(Object),
    });
    expect(showToast).toHaveBeenCalledWith({ kind: 'failed' });
    expect(playErrorNotification).toHaveBeenCalledTimes(1);
    expect(playSuccessNotification).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('ignores trades that are still pending', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.PENDING),
    );
    const showToast = jest.fn();

    renderHandler().handler({}, showToast);

    expect(showToast).not.toHaveBeenCalled();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });

  it('does nothing when there are no tracked trades', () => {
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    renderHandler().handler({}, showToast);

    expect(mockGetHistoryItem).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('dedupes repeated state changes for the same terminal status', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    const registration = renderHandler();
    registration.handler({}, showToast);
    registration.handler({}, showToast);

    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
