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
  getTrackedQuickBuyTradeIds,
  isQuickBuyTransaction,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from './resolveQuickBuyTerminalToast';
import {
  beginPostSwapShareSession,
  clearPostSwapShareSession,
  getPostSwapShareSession,
} from '../../Views/SocialLeaderboard/PostSwapShareBottomSheet';

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
    clearPostSwapShareSession();
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

  it('updates the post-swap share session instead of showing a toast', () => {
    beginPostSwapShareSession({
      target: {
        tokenAddress: '0xpepe',
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe',
        chain: 'eip155:1',
      },
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: '0xpepe',
        chain: 'ethereum',
        side: 'buy',
      },
    });
    trackQuickBuyTrade('tx-1', { ...buyTrade, postSwapShare: true });
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    const result = resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(result).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
    expect(buildQuickBuyToastOptions).not.toHaveBeenCalled();
    expect(playSuccessNotification).toHaveBeenCalledTimes(1);
    expect(getPostSwapShareSession()?.status).toBe('complete');
  });

  it('backfills the post-swap share transaction hash from bridge history', () => {
    beginPostSwapShareSession({
      target: {
        tokenAddress: '0xpepe',
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe',
        chain: 'eip155:1',
      },
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: '0xpepe',
        chain: 'ethereum',
        side: 'buy',
      },
    });
    trackQuickBuyTrade('tx-1', { ...buyTrade, postSwapShare: true });
    mockGetHistoryItem.mockReturnValue({
      ...historyItemWithStatus(StatusTypes.COMPLETE),
      reportedSubmittedTxHash: '0xbridge-hash',
    });

    resolveQuickBuyTerminalToast('tx-1', jest.fn(), theme);

    expect(getPostSwapShareSession()?.transactionHash).toBe('0xbridge-hash');
  });

  it('falls back to the source-chain hash in bridge status', () => {
    beginPostSwapShareSession({
      target: {
        tokenAddress: '0xpepe',
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe',
        chain: 'eip155:1',
      },
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: '0xpepe',
        chain: 'ethereum',
        side: 'buy',
      },
    });
    trackQuickBuyTrade('tx-1', { ...buyTrade, postSwapShare: true });
    mockGetHistoryItem.mockReturnValue({
      ...historyItemWithStatus(StatusTypes.COMPLETE),
      status: {
        status: StatusTypes.COMPLETE,
        srcChain: { chainId: 1, txHash: '0xsource-hash' },
      },
    });

    resolveQuickBuyTerminalToast('tx-1', jest.fn(), theme);

    expect(getPostSwapShareSession()?.transactionHash).toBe('0xsource-hash');
  });

  it('shows the normal terminal toast when the share session was dismissed', () => {
    trackQuickBuyTrade('tx-1', { ...buyTrade, postSwapShare: true });
    mockGetHistoryItem.mockReturnValue(
      historyItemWithStatus(StatusTypes.COMPLETE),
    );
    const showToast = jest.fn();

    resolveQuickBuyTerminalToast('tx-1', showToast, theme);

    expect(showToast).toHaveBeenCalledWith({ kind: 'complete' });
  });
});
