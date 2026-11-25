import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import type { PredictFundingService } from '../services/PredictFundingService';
import type {
  PredictAmount,
  PredictTimestamp,
  PredictVenueId,
  PredictWithdrawReceipt,
  PredictWithdrawReceiptStatus,
} from '../types';
import {
  MAX_WITHDRAW_READ_FAILURES,
  useWithdrawReceipt,
} from './useWithdrawReceipt';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const VENUE_ID = 'kalshi' as PredictVenueId;
const PREVIEW_ID = '2f1c7f5e-0c4a-4d1c-9f0b-7b1a3f9c2d10';

const receipt = (
  overrides: Partial<PredictWithdrawReceipt> = {},
): PredictWithdrawReceipt => ({
  operationId: 'operation-1',
  previewId: PREVIEW_ID,
  venueId: VENUE_ID,
  currency: 'USD',
  mode: 'fixed',
  status: 'processing',
  needsManualReview: false,
  requestedAmount: '10.00' as PredictAmount,
  withdrawnAmount: null,
  venueTransferId: null,
  destination: { address: '0xdestination', network: 'base', source: 'venue' },
  createdAt: '2026-01-01T00:00:00.000Z' as PredictTimestamp,
  resolvedAt: null,
  ...overrides,
});

describe('useWithdrawReceipt', () => {
  const originalAppState = AppState.currentState;
  let observeWithdraw: jest.Mock;
  let service: Pick<PredictFundingService, 'observeWithdraw'>;
  let appStateChangeHandler: ((state: string) => void) | undefined;
  const onReceipt = jest.fn();

  const advance = async (milliseconds: number) => {
    await act(async () => {
      jest.advanceTimersByTime(milliseconds);
    });
  };

  const renderObserved = (
    initialReceipt: PredictWithdrawReceipt | null,
    networkTier: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' = 'WIFI',
    isWalletUnlocked = true,
  ) =>
    renderHook(
      ({ latest, tier, unlocked }) =>
        useWithdrawReceipt({
          service,
          venueId: VENUE_ID,
          receipt: latest,
          networkTier: tier,
          isWalletUnlocked: unlocked,
          onReceipt,
        }),
      {
        initialProps: {
          latest: initialReceipt,
          tier: networkTier,
          unlocked: isWalletUnlocked,
        },
      },
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    AppState.currentState = 'active';
    appStateChangeHandler = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      handler: (state: string) => void,
    ) => {
      appStateChangeHandler = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);
    observeWithdraw = jest.fn();
    service = { observeWithdraw };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    AppState.currentState = originalAppState;
  });

  it('waits for the first backoff step, then reports the receipt', async () => {
    observeWithdraw.mockResolvedValue(receipt());
    const { result } = renderObserved(receipt({ status: 'pending' }));

    await advance(1_999);
    expect(observeWithdraw).not.toHaveBeenCalled();

    await advance(1);
    expect(observeWithdraw).toHaveBeenCalledWith(
      VENUE_ID,
      PREVIEW_ID,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(onReceipt).toHaveBeenCalledWith(receipt());
    expect(result.current).toMatchObject({ isStalled: false });
    expect(typeof result.current.retry).toBe('function');
  });

  it('backs off through every step and repeats the last one', async () => {
    observeWithdraw.mockResolvedValue(receipt());
    renderObserved(receipt());

    await advance(2_000);
    await advance(4_000);
    await advance(8_000);
    await advance(15_000);
    await advance(15_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(5);
  });

  it.each<[PredictWithdrawReceiptStatus]>([
    ['settled'],
    ['failed'],
    ['returned'],
    ['rejected'],
  ])('does not read once the receipt is %s', async (status) => {
    renderObserved(receipt({ status }));

    await advance(60_000);

    expect(observeWithdraw).not.toHaveBeenCalled();
  });

  it('does not read while the Commit is still in flight', async () => {
    renderObserved(null);

    await advance(60_000);

    expect(observeWithdraw).not.toHaveBeenCalled();
  });

  it('stops when the observed receipt leaves an in-progress status', async () => {
    observeWithdraw.mockResolvedValue(receipt());
    const { rerender } = renderObserved(receipt());

    await advance(2_000);
    expect(observeWithdraw).toHaveBeenCalledTimes(1);

    rerender({
      latest: receipt({ status: 'settled' }),
      tier: 'WIFI',
      unlocked: true,
    });
    await advance(60_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(1);
  });

  it('stops when the backend asks for manual review', async () => {
    observeWithdraw.mockResolvedValue(receipt({ needsManualReview: true }));
    renderObserved(receipt());

    await advance(2_000);
    await advance(60_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(1);
  });

  it('does not read while the app is not active, and resumes on return', async () => {
    AppState.currentState = 'background';
    observeWithdraw.mockResolvedValue(receipt());
    renderObserved(receipt());

    await advance(60_000);
    expect(observeWithdraw).not.toHaveBeenCalled();

    AppState.currentState = 'active';
    await act(async () => {
      appStateChangeHandler?.('active');
    });
    await advance(2_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(1);
  });

  it('skips a read with no connection and retries the same step', async () => {
    observeWithdraw.mockResolvedValue(receipt());
    const { rerender } = renderObserved(receipt(), 'NONE');

    await advance(2_000);
    expect(observeWithdraw).not.toHaveBeenCalled();

    rerender({ latest: receipt(), tier: 'WIFI', unlocked: true });
    await advance(2_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(1);
  });

  it('doubles the first step on slow cellular', async () => {
    observeWithdraw.mockResolvedValue(receipt());
    renderObserved(receipt(), 'SLOW_CELLULAR');

    await advance(3_999);
    expect(observeWithdraw).not.toHaveBeenCalled();

    await advance(1);
    expect(observeWithdraw).toHaveBeenCalledTimes(1);
  });

  it('stops after a bounded number of consecutive read failures', async () => {
    observeWithdraw.mockRejectedValue(new Error('unreachable'));
    renderObserved(receipt());

    await advance(2_000);
    await advance(4_000);
    await advance(8_000);
    await advance(15_000);
    await advance(15_000);
    expect(observeWithdraw).toHaveBeenCalledTimes(MAX_WITHDRAW_READ_FAILURES);

    await advance(60_000);
    expect(observeWithdraw).toHaveBeenCalledTimes(MAX_WITHDRAW_READ_FAILURES);
    expect(onReceipt).not.toHaveBeenCalled();
  });

  it('exposes a stall after the failure budget and resumes the same Preview', async () => {
    observeWithdraw.mockRejectedValue(new Error('unreachable'));
    const { result } = renderObserved(receipt());

    await advance(2_000);
    await advance(4_000);
    await advance(8_000);
    await advance(15_000);
    await advance(15_000);
    expect(result.current.isStalled).toBe(true);

    observeWithdraw.mockResolvedValue(receipt({ status: 'settled' }));
    await act(async () => {
      result.current.retry();
    });

    // A manual check reads immediately; it does not wait out the backoff.
    expect(observeWithdraw).toHaveBeenCalledTimes(
      MAX_WITHDRAW_READ_FAILURES + 1,
    );
    await advance(0);
    expect(observeWithdraw).toHaveBeenLastCalledWith(
      VENUE_ID,
      PREVIEW_ID,
      expect.anything(),
    );
    expect(onReceipt).toHaveBeenCalledWith(receipt({ status: 'settled' }));
    expect(result.current.isStalled).toBe(false);
  });

  it('does not spend the failure budget while the vault is locked', async () => {
    observeWithdraw.mockRejectedValue(new Error('unreachable'));
    const { result, rerender } = renderObserved(receipt());

    await advance(2_000);
    await advance(4_000);
    await advance(8_000);
    await advance(15_000);
    expect(observeWithdraw).toHaveBeenCalledTimes(4);

    rerender({ latest: receipt(), tier: 'WIFI', unlocked: false });
    await advance(10 * 60_000);
    expect(observeWithdraw).toHaveBeenCalledTimes(4);
    expect(result.current.isStalled).toBe(false);

    observeWithdraw.mockResolvedValue(receipt({ status: 'settled' }));
    rerender({ latest: receipt(), tier: 'WIFI', unlocked: true });
    await advance(2_000);

    expect(observeWithdraw).toHaveBeenCalledTimes(5);
    expect(onReceipt).toHaveBeenCalledWith(receipt({ status: 'settled' }));
    expect(result.current.isStalled).toBe(false);
  });

  it('aborts an in-flight read when the surface unmounts', async () => {
    let signal: AbortSignal | undefined;
    observeWithdraw.mockImplementation((_venueId, _previewId, options) => {
      signal = options.signal;
      return new Promise(() => undefined);
    });
    const { unmount } = renderObserved(receipt());

    await advance(2_000);
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
