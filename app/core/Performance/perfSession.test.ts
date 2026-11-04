import { NativeModules } from 'react-native';
import type { MiddlewareAPI } from 'redux';
import {
  perfSessionReduxMiddleware,
  recordPerfSpanEnd,
  recordPerfSpanStart,
  resetPerfSessionForTests,
  sanitizePerfText,
  setPerfSessionManualProfiling,
  setPerfSessionScreen,
  wrapPerfSpanCallback,
} from './perfSession';

const ALL_ON = '{"spans":true,"redux":true,"jsLag":true}';

function installModule(features = ALL_ON) {
  const nativeModule = {
    setScreen: jest.fn(),
    report: jest.fn().mockResolvedValue(features),
    setManualProfiling: jest.fn(),
  };
  NativeModules.MetaMaskPerfSession = nativeModule;
  return nativeModule;
}

function lastReport(report: jest.Mock) {
  const calls = report.mock.calls;
  return JSON.parse(calls[calls.length - 1][0]);
}

function dispatch(action: unknown) {
  const next = jest.fn((a) => a);
  perfSessionReduxMiddleware({} as MiddlewareAPI)(next)(action);
  return next;
}

describe('perfSession', () => {
  const originalModule = NativeModules.MetaMaskPerfSession;

  beforeEach(() => {
    jest.useFakeTimers();
    resetPerfSessionForTests();
  });

  afterEach(() => {
    resetPerfSessionForTests();
    jest.useRealTimers();
    if (originalModule === undefined) {
      delete NativeModules.MetaMaskPerfSession;
    } else {
      NativeModules.MetaMaskPerfSession = originalModule;
    }
  });

  describe('setPerfSessionScreen', () => {
    it('forwards the screen name when the native module is registered', () => {
      const nativeModule = installModule();

      setPerfSessionScreen('WalletView');

      expect(nativeModule.setScreen).toHaveBeenCalledWith('WalletView');
    });

    it('ignores a missing screen name', () => {
      const nativeModule = installModule();

      setPerfSessionScreen(undefined);

      expect(nativeModule.setScreen).not.toHaveBeenCalled();
    });
  });

  describe('without the native module', () => {
    beforeEach(() => {
      delete NativeModules.MetaMaskPerfSession;
    });

    it('does nothing for screens, spans and manual profiling', () => {
      expect(() => {
        setPerfSessionScreen('WalletView');
        recordPerfSpanStart('Swaps', 'a');
        recordPerfSpanEnd('Swaps', 'a', 'ok');
        setPerfSessionManualProfiling(true);
      }).not.toThrow();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('returns trace callbacks unchanged', () => {
      const fn = jest.fn();

      expect(wrapPerfSpanCallback('Swaps', undefined, fn)).toBe(fn);
    });

    it('passes actions through the Redux middleware', () => {
      const action = { type: 'swaps/setQuotes' };

      const next = dispatch(action);

      expect(next).toHaveBeenCalledWith(action);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('sanitizePerfText', () => {
    it.each([
      ['wallet-send-button', 'wallet-send-button'],
      ['0x1234abcd', undefined],
      ['amount-1234567', undefined],
      ['', undefined],
      ['café\n', 'caf'],
    ])('sanitizes %j to %j', (input, expected) => {
      expect(sanitizePerfText(input)).toBe(expected);
    });

    it('truncates to the maximum length', () => {
      expect(sanitizePerfText('a'.repeat(150))).toHaveLength(100);
    });
  });

  describe('spans', () => {
    it('reports manual spans once per second', async () => {
      const nativeModule = installModule();
      jest.setSystemTime(1_000_000);

      recordPerfSpanStart('Swaps Fetch Quotes', 'quote-1');
      jest.setSystemTime(1_000_840);
      recordPerfSpanEnd('Swaps Fetch Quotes', 'quote-1', 'ok');
      await jest.advanceTimersByTimeAsync(1000);

      expect(nativeModule.report).toHaveBeenCalledTimes(1);
      expect(lastReport(nativeModule.report).spans).toEqual([
        {
          name: 'Swaps Fetch Quotes',
          id: 'quote-1',
          t: 1_000_000,
          durationMs: 840,
          status: 'ok',
        },
      ]);
    });

    it('uses the start and end overrides trace() accepts', async () => {
      const nativeModule = installModule();

      recordPerfSpanStart('Unlock', undefined, 5_000);
      recordPerfSpanEnd('Unlock', undefined, undefined, 5_250);
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).spans[0]).toMatchObject({
        name: 'Unlock',
        t: 5_000,
        durationMs: 250,
      });
    });

    it('drops ids that look like user data', async () => {
      const nativeModule = installModule();

      recordPerfSpanStart('Transaction', '0xabcdef123456');
      recordPerfSpanEnd('Transaction', '0xabcdef123456');
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).spans[0].id).toBeUndefined();
    });

    it('records traced callbacks without changing their result', async () => {
      const nativeModule = installModule();
      const promise = Promise.resolve('quote');

      const wrapped = wrapPerfSpanCallback('Swaps', undefined, () => promise);
      const result = wrapped();
      const syncResult = wrapPerfSpanCallback('Sync', 'x', () => 42)();
      await jest.advanceTimersByTimeAsync(1000);

      expect(result).toBe(promise);
      expect(syncResult).toBe(42);
      expect(
        lastReport(nativeModule.report).spans.map(
          (span: { name: string; status: string }) =>
            `${span.name}:${span.status}`,
        ),
      ).toEqual(['Sync:ok', 'Swaps:ok']);
    });

    it('records a thrown callback as an error and rethrows', async () => {
      const nativeModule = installModule();
      const wrapped = wrapPerfSpanCallback('Swaps', undefined, () => {
        throw new Error('boom');
      });

      expect(() => wrapped()).toThrow('boom');
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).spans[0].status).toBe('error');
    });

    it('stops collecting spans once the collector turns them off', async () => {
      const nativeModule = installModule(
        '{"spans":false,"redux":false,"jsLag":false}',
      );
      recordPerfSpanStart('Startup');
      await jest.advanceTimersByTimeAsync(1000);

      recordPerfSpanStart('Swaps');
      recordPerfSpanEnd('Swaps');
      await jest.advanceTimersByTimeAsync(5000);

      expect(nativeModule.report).toHaveBeenCalledTimes(2);
      expect(lastReport(nativeModule.report).spans).toBeUndefined();
    });
  });

  describe('redux middleware', () => {
    it('counts action types and keeps the controller of background updates', async () => {
      const nativeModule = installModule();

      dispatch({
        type: 'UPDATE_BG_STATE',
        payload: { key: 'TokenRatesController' },
      });
      dispatch({
        type: 'UPDATE_BG_STATE',
        payload: { key: 'TokenRatesController' },
      });
      dispatch({ type: 'swaps/setQuotes', payload: { amount: '0x1234567' } });
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).redux).toEqual({
        count: 3,
        types: {
          'UPDATE_BG_STATE:TokenRatesController': 2,
          'swaps/setQuotes': 1,
        },
      });
    });

    it('ignores dynamic background update keys', async () => {
      const nativeModule = installModule();

      dispatch({
        type: 'UPDATE_BG_STATE',
        payload: { key: 'not a controller!' },
      });
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).redux.types).toEqual({
        UPDATE_BG_STATE: 1,
      });
    });
  });

  describe('JS lag probe', () => {
    it('reports the worst event-loop delay of the window', async () => {
      const nativeModule = installModule();
      recordPerfSpanStart('Startup');
      // The first report turns the probe on.
      await jest.advanceTimersByTimeAsync(1000);

      // Simulate the JS thread being blocked for 300 ms.
      jest.setSystemTime(Date.now() + 300);
      await jest.advanceTimersByTimeAsync(1000);

      expect(lastReport(nativeModule.report).jsLagMs).toBeGreaterThanOrEqual(
        300,
      );
    });

    it('does not run until the collector enables it', async () => {
      installModule('{"spans":true,"redux":true,"jsLag":false}');
      recordPerfSpanStart('Startup');

      await jest.advanceTimersByTimeAsync(1000);

      // Only the report timer is pending.
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  it('tells the sampler about manual profiling', () => {
    const nativeModule = installModule();

    setPerfSessionManualProfiling(true);

    expect(nativeModule.setManualProfiling).toHaveBeenCalledWith(true);
  });
});
