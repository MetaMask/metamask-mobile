import type {
  AccountReadinessAdapter,
  AccountReadinessSnapshot,
} from '../accountReadiness.types';
import {
  createAccountReadinessObservation,
  AccountReadinessObservationContext,
  AccountReadinessObservation,
} from './accountReadinessObservation';

const review: AccountReadinessSnapshot = {
  readiness: 'verifying',
  card: { kind: 'verifying' },
};
const ready: AccountReadinessSnapshot = {
  readiness: 'ready',
  card: { kind: 'verified' },
};
const context = {
  scope: 'profile:environment',
  isFocused: true,
  appState: 'active',
  isEligible: true,
  isSetupOpen: false,
  hardwareTier: null,
  networkTier: null,
  latency: 'UNKNOWN',
} as const;

const flush = async (): Promise<void> => {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve();
  }
};

interface ObservationFixture {
  observer: AccountReadinessObservation;
  readStatus: jest.Mock<
    Promise<AccountReadinessSnapshot>,
    [{ signal: AbortSignal }]
  >;
  publish: jest.Mock;
  onMetadata: jest.Mock;
  unsubscribe: jest.Mock;
  removeAppState: jest.Mock;
  initial: AccountReadinessObservationContext;
  emit(value: AccountReadinessSnapshot): void;
  appState(state: string): void;
}

function fixture(
  overrides: Partial<AccountReadinessObservationContext> = {},
): ObservationFixture {
  const readStatus = jest
    .fn<Promise<AccountReadinessSnapshot>, [{ signal: AbortSignal }]>()
    .mockResolvedValue(review);
  const unsubscribe = jest.fn();
  const removeAppState = jest.fn();
  let appStateListener: (state: string) => void = () => undefined;
  let listener: (value: AccountReadinessSnapshot) => void = () => undefined;
  const adapter: AccountReadinessAdapter = {
    readStatus,
    subscribe: (callback) => {
      listener = callback;
      return unsubscribe;
    },
    openSetup: jest.fn(),
  };
  const publish = jest.fn();
  const onMetadata = jest.fn();
  const initial = { ...context, ...overrides };
  const observer = createAccountReadinessObservation({
    adapter,
    context: initial,
    publish,
    onMetadata,
    clock: { now: Date.now, setTimeout, clearTimeout },
    subscribeAppState: (callback) => {
      appStateListener = callback;
      return removeAppState;
    },
  });
  return {
    observer,
    readStatus,
    publish,
    onMetadata,
    unsubscribe,
    removeAppState,
    initial,
    emit: (value: AccountReadinessSnapshot): void => listener(value),
    appState: (state: string): void => appStateListener(state),
  };
}

describe('account readiness observation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('coalesces focus, foreground and reconnect within five seconds', async () => {
    const { observer, readStatus, initial } = fixture();
    await flush();

    observer.update({ ...initial, isFocused: false });
    observer.update(initial);
    observer.update({ ...initial, appState: 'background' });
    observer.update(initial);
    observer.update({ ...initial, networkTier: 'NONE' });
    observer.update(initial);
    await flush();

    expect(readStatus).toHaveBeenCalledTimes(1);
    observer.dispose();
  });

  it('explicit retry bypasses the gap but not single flight', async () => {
    const { observer, readStatus } = fixture();
    await flush();
    readStatus.mockImplementation(async () => new Promise(() => undefined));

    observer.refreshStatus();
    observer.refreshStatus();
    await flush();
    observer.refreshStatus();
    await flush();

    expect(readStatus).toHaveBeenCalledTimes(2);
    observer.dispose();
  });

  it.each([
    [null, null, 15_000],
    ['LOW', null, 15_000],
    ['HIGH', 'WIFI', 15_000],
    ['LOW', 'SLOW_CELLULAR', 60_000],
  ] as const)(
    'uses %s hardware and %s network interval',
    async (hardwareTier, networkTier, delay) => {
      const { observer, readStatus } = fixture({ hardwareTier, networkTier });
      await flush();

      jest.advanceTimersByTime(delay - 1);
      await flush();
      expect(readStatus).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1);
      await flush();

      expect(readStatus).toHaveBeenCalledTimes(2);
      observer.dispose();
    },
  );

  it.each([
    ['LOW', 5],
    [null, 9],
    ['HIGH', 9],
  ] as const)(
    'caps %s hardware including the initial read at %s reads',
    async (hardwareTier, count) => {
      const { observer, readStatus } = fixture({ hardwareTier });
      await flush();

      for (let index = 0; index < 12; index += 1) {
        jest.advanceTimersByTime(15_000);
        await flush();
      }

      expect(readStatus).toHaveBeenCalledTimes(count);
      expect(jest.getTimerCount()).toBe(0);
      observer.dispose();
    },
  );

  it('keeps an absolute review budget across tier changes', async () => {
    const { observer, initial, readStatus } = fixture({
      networkTier: 'SLOW_CELLULAR',
    });
    await flush();
    jest.advanceTimersByTime(60_000);
    await flush();

    observer.update({ ...initial, networkTier: 'WIFI' });
    for (let index = 0; index < 6; index += 1) {
      jest.advanceTimersByTime(15_000);
      await flush();
    }

    expect(readStatus).toHaveBeenCalledTimes(6);
    expect(jest.getTimerCount()).toBe(0);
    observer.dispose();
  });

  it('stops after two consecutive failures and retries only explicitly', async () => {
    const { observer, readStatus, publish } = fixture();
    await flush();
    readStatus.mockRejectedValue(new Error('network'));

    for (let index = 0; index < 4; index += 1) {
      jest.advanceTimersByTime(15_000);
      await flush();
    }
    expect(readStatus).toHaveBeenCalledTimes(3);
    expect(publish).toHaveBeenLastCalledWith(review);
    observer.refreshStatus();
    await flush();

    expect(readStatus).toHaveBeenCalledTimes(4);
    observer.dispose();
  });

  it.each([
    ready,
    {
      readiness: 'setup_required',
      card: {
        kind: 'action_required',
        reason: 'activation_required',
        intent: 'resume',
      },
    },
    {
      readiness: 'setup_required',
      card: { kind: 'finish_verifying', intent: 'resume' },
    },
    { readiness: 'setup_required', card: { kind: 'not_started' } },
  ] satisfies AccountReadinessSnapshot[])(
    'stops polling on $card.kind',
    async (value) => {
      const { observer, readStatus, publish } = fixture();
      await flush();
      readStatus.mockResolvedValue(value);

      jest.advanceTimersByTime(15_000);
      await flush();
      jest.advanceTimersByTime(120_000);
      await flush();

      expect(readStatus).toHaveBeenCalledTimes(2);
      expect(publish).toHaveBeenLastCalledWith(value);
      expect(jest.getTimerCount()).toBe(0);
      observer.dispose();
    },
  );

  it.each([
    { isFocused: false },
    { appState: 'background' },
    { isEligible: false },
    { networkTier: 'NONE' as const },
    { isSetupOpen: true },
    { scope: 'replacement' },
    { scope: null },
  ])('aborts and fences stale responses for %o', async (change) => {
    const { observer, initial, readStatus, publish } = fixture();
    await flush();
    let resolve: (value: AccountReadinessSnapshot) => void = () => undefined;
    readStatus.mockImplementation(
      async () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    observer.refreshStatus();
    await flush();
    const signal = readStatus.mock.calls[1][0].signal;

    observer.update({ ...initial, ...change });
    resolve(ready);
    await flush();

    expect(signal.aborted).toBe(true);
    expect(publish).not.toHaveBeenCalledWith(ready);
    observer.dispose();
  });

  it('does no status work while known offline', async () => {
    const { observer, readStatus } = fixture({
      networkTier: 'NONE',
      hardwareTier: 'LOW',
    });

    observer.refreshStatus();
    jest.advanceTimersByTime(300_000);
    await flush();

    expect(readStatus).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    observer.dispose();
  });

  it('aborts a timed out request and retains the last projection', async () => {
    const { observer, readStatus, publish, onMetadata } = fixture();
    await flush();
    readStatus.mockImplementation(async () => new Promise(() => undefined));
    observer.refreshStatus();
    await flush();

    jest.advanceTimersByTime(15_000);
    await flush();

    expect(readStatus.mock.calls[1][0].signal.aborted).toBe(true);
    expect(publish).toHaveBeenLastCalledWith(review);
    expect(onMetadata).toHaveBeenLastCalledWith({
      isRefreshing: false,
      readError: 'unavailable',
      latency: 'unknown',
    });
    observer.dispose();
  });

  it('uses measured slow latency only as metadata', async () => {
    const { observer, readStatus, onMetadata } = fixture({
      latency: 'SLOW',
      networkTier: 'WIFI',
    });
    await flush();

    jest.advanceTimersByTime(15_000);
    await flush();

    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(onMetadata).toHaveBeenLastCalledWith({
      isRefreshing: false,
      readError: 'none',
      latency: 'slow',
    });
    observer.dispose();
  });

  it('removes subscriptions and timers on disposal', async () => {
    const {
      observer,
      readStatus,
      unsubscribe,
      removeAppState,
      appState,
      emit,
      publish,
    } = fixture();
    await flush();

    observer.dispose();
    observer.dispose();
    appState('active');
    emit(ready);
    observer.refreshStatus();
    jest.advanceTimersByTime(300_000);
    await flush();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(readStatus).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalledWith(ready);
    expect(jest.getTimerCount()).toBe(0);
  });
});
