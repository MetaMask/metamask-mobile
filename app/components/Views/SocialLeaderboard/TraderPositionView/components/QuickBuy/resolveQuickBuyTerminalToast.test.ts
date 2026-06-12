import { StatusTypes } from '@metamask/bridge-controller';
import { resolveQuickBuyTerminalToast } from './resolveQuickBuyTerminalToast';
import {
  getTrackedQuickBuyTradeIds,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import Engine from '../../../../../../core/Engine';
import {
  playSuccessNotification,
  playErrorNotification,
} from '../../../../../../util/haptics';

jest.mock('./quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('../../../../../../util/haptics', () => ({
  playSuccessNotification: jest.fn(),
  playErrorNotification: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
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

describe('resolveQuickBuyTerminalToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
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
});
