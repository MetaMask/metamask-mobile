import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import MoneyFirstTimeDepositView from './MoneyFirstTimeDepositView';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { SCREEN_NAMES } from '../../constants/moneyEvents';
import { MoneyFirstTimeDepositViewTestIds } from './MoneyFirstTimeDepositView.testIds';

const mockNavigate = jest.fn();
const mockTrackScreenViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useMountEffect', () => ({
  __esModule: true,
  default: (fn: () => void) => fn(),
}));

let mockTriggerCallbacks: Record<string, () => void> = {};
const mockSetString = jest.fn();
const mockSetNumber = jest.fn();
const mockRemove = jest.fn();
let mockOnError: ((error: { message: string }) => void) | undefined;

jest.mock('rive-react-native', () => {
  const mockRiveRef = {
    setNumber: (...args: unknown[]) => mockSetNumber(...args),
  };

  return {
    __esModule: true,
    default: jest.fn(({ onError, ...props }) => {
      mockOnError = onError;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { View } = require('react-native');
      return <View {...props} />;
    }),
    useRive: () => [jest.fn(), mockRiveRef],
    useRiveString: () => [undefined, mockSetString],
    useRiveTrigger: (
      _riveRef: unknown,
      path: string,
      callback?: () => void,
    ) => {
      if (callback) {
        mockTriggerCallbacks[path] = callback;
      }
      return jest.fn();
    },
    AutoBind: (value: boolean) => ({ type: 'autobind', value }),
    Fit: { Layout: 'layout' },
    RNRiveError: class {},
  };
});

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

describe('MoneyFirstTimeDepositView', () => {
  interface SensorData {
    x: number;
    y: number;
  }
  let sensorCallback: ((data: SensorData) => void) | undefined;
  let rafCallback: ((time: number) => void) | undefined;
  let originalRaf: typeof global.requestAnimationFrame;
  let originalCaf: typeof global.cancelAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerCallbacks = {};
    mockOnError = undefined;
    sensorCallback = undefined;
    rafCallback = undefined;

    (Accelerometer.addListener as jest.Mock).mockImplementation(
      (cb: (data: SensorData) => void) => {
        sensorCallback = cb;
        return { remove: mockRemove };
      },
    );

    originalRaf = global.requestAnimationFrame;
    originalCaf = global.cancelAnimationFrame;
    global.requestAnimationFrame = jest.fn((cb: (time: number) => void) => {
      rafCallback = cb;
      return 0;
    });
    global.cancelAnimationFrame = jest.fn();

    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackScreenViewed: mockTrackScreenViewed,
    });
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
  });

  describe('Rendering', () => {
    it('renders the Rive animation component', () => {
      const { getByTestId } = render(<MoneyFirstTimeDepositView />);

      expect(
        getByTestId(MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });
  });

  describe('Analytics', () => {
    it('initializes useMoneyAnalytics with first-time deposit screen name', () => {
      render(<MoneyFirstTimeDepositView />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_FIRST_TIME_DEPOSIT,
      });
    });

    it('fires trackScreenViewed on mount', () => {
      render(<MoneyFirstTimeDepositView />);

      expect(mockTrackScreenViewed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rive text initialization', () => {
    it('sets title and content strings on mount', () => {
      render(<MoneyFirstTimeDepositView />);

      expect(mockSetString).toHaveBeenCalledWith(
        strings('money.first_time_deposit.title'),
      );
      expect(mockSetString).toHaveBeenCalledWith(
        strings('money.first_time_deposit.content'),
      );
    });
  });

  describe('Done trigger', () => {
    it('navigates home when done trigger fires', () => {
      render(<MoneyFirstTimeDepositView />);

      mockTriggerCallbacks.done();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });

  describe('Error handling', () => {
    it('navigates home when Rive reports an error', () => {
      render(<MoneyFirstTimeDepositView />);

      mockOnError?.({ message: 'test rive error' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });

  describe('Android back button', () => {
    it('registers a BackHandler listener on mount', () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      render(<MoneyFirstTimeDepositView />);

      expect(addSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );

      addSpy.mockRestore();
    });

    it('navigates home and returns true when hardware back is pressed', () => {
      let backPressHandler: (() => boolean) | undefined;
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          backPressHandler = handler as () => boolean;
          return { remove: jest.fn() };
        });

      render(<MoneyFirstTimeDepositView />);

      const result = backPressHandler?.();

      expect(result).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });

  describe('Parallax', () => {
    // Controllable clock. `mockNow` starts at 0 so `calibrationStartedAt`
    // (captured during render) is 0; tests advance it explicitly to cross the
    // calibration window rather than relying on Date.now() call ordering.
    let mockNow: number;
    let dateSpy: jest.SpyInstance<number, []>;
    let originalPlatformOS: typeof Platform.OS;

    beforeEach(() => {
      mockNow = 0;
      dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
      // Pin to Android so the sign-sensitive assertions below are deterministic
      // (the Jest env defaults Platform.OS to 'ios', which flips the sign). The
      // per-platform behavior itself is covered in 'Platform axis sign'.
      originalPlatformOS = Platform.OS;
      Platform.OS = 'android';
    });

    afterEach(() => {
      dateSpy.mockRestore();
      Platform.OS = originalPlatformOS;
    });

    it('keeps parallax centered during calibration regardless of device tilt', () => {
      // Clock never advances past CALIBRATION_DURATION_MS (300ms), so no
      // baseline is ever computed and the calibration branch stays active.
      render(<MoneyFirstTimeDepositView />);

      // A strong tilt arrives mid-calibration; it must be ignored.
      act(() => {
        sensorCallback?.({ x: 0.3, y: 0.3 });
      });

      // One render frame. Targets are pinned to 50, so EMA smoothing leaves
      // the pushed values at the centered default: 50 + 0.04 * (50 - 50) = 50.
      act(() => {
        rafCallback?.(0);
      });

      expect(mockSetNumber).toHaveBeenCalledWith('xValue', 50);
      expect(mockSetNumber).toHaveBeenCalledWith('yValue', 50);
    });

    it('measures live parallax relative to the resting baseline', () => {
      render(<MoneyFirstTimeDepositView />);

      // Advance past the calibration window, then take a calibration reading.
      // Threshold crossed, so baseline = {0.1, 0.05}.
      mockNow = 301;
      act(() => {
        sensorCallback?.({ x: 0.1, y: 0.05 });
      });

      // Live reading identical to the baseline. After subtraction the g-force
      // is 0, so gForceToParallax(0) = 50 (perfectly centered). Without baseline
      // subtraction this would be gForceToParallax(0.1) = 60 instead.
      act(() => {
        sensorCallback?.({ x: 0.1, y: 0.05 });
      });

      act(() => {
        rafCallback?.(0);
      });

      // smoothed = 50 + 0.04 * (50 - 50) = 50
      expect(mockSetNumber).toHaveBeenCalledWith('xValue', 50);
      expect(mockSetNumber).toHaveBeenCalledWith('yValue', 50);
    });

    it('averages multiple calibration samples into the resting baseline', () => {
      render(<MoneyFirstTimeDepositView />);

      // First sample lands inside the calibration window (clock still 0).
      act(() => {
        sensorCallback?.({ x: 0.1, y: 0.1 });
      });

      // Advance past the window, then a second sample. It is accumulated first
      // (sum = 0.1 + 0.3 = 0.4 over count = 2) and only then is the baseline
      // computed: 0.4 / 2 = 0.2 on both axes (a true average, not last-wins).
      mockNow = 301;
      act(() => {
        sensorCallback?.({ x: 0.3, y: 0.3 });
      });

      // Live reading. With averaged baseline 0.2:
      //   0.4 - 0.2 = 0.2 -> gForceToParallax(0.2) = 70 on both axes
      // If the baseline were last-wins (0.3) it would be gForceToParallax(0.1)
      // = 60 instead, giving 50.4 below rather than 50.8.
      act(() => {
        sensorCallback?.({ x: 0.4, y: 0.4 });
      });

      act(() => {
        rafCallback?.(0);
      });

      // smoothed = 50 + 0.04 * (70 - 50) = 50.8
      expect(mockSetNumber).toHaveBeenCalledWith(
        'xValue',
        expect.closeTo(50.8),
      );
      expect(mockSetNumber).toHaveBeenCalledWith(
        'yValue',
        expect.closeTo(50.8),
      );
    });

    it('converts tilt through gForceToParallax and EMA smoothing before pushing to Rive', () => {
      render(<MoneyFirstTimeDepositView />);

      // Calibration reading establishes baseline = {0.1, 0.05}.
      mockNow = 301;
      act(() => {
        sensorCallback?.({ x: 0.1, y: 0.05 });
      });

      // Live reading. Baseline-relative g-force:
      //   x: 0.3 - 0.1 = 0.2  -> gForceToParallax(0.2) = ((0.2/0.5 + 1)/2)*100 = 70
      //   y: 0.15 - 0.05 = 0.1 -> gForceToParallax(0.1) = ((0.1/0.5 + 1)/2)*100 = 60
      act(() => {
        sensorCallback?.({ x: 0.3, y: 0.15 });
      });

      // One render frame applies EMA smoothing (SMOOTHING_FACTOR = 0.04):
      //   x: 50 + 0.04 * (70 - 50) = 50.8
      //   y: 50 + 0.04 * (60 - 50) = 50.4
      act(() => {
        rafCallback?.(0);
      });

      expect(mockSetNumber).toHaveBeenCalledWith(
        'xValue',
        expect.closeTo(50.8),
      );
      expect(mockSetNumber).toHaveBeenCalledWith(
        'yValue',
        expect.closeTo(50.4),
      );
    });

    it('clamps tilt beyond TILT_SENSITIVITY to the parallax extremes', () => {
      render(<MoneyFirstTimeDepositView />);

      // Calibration reading establishes baseline = {0, 0}.
      mockNow = 301;
      act(() => {
        sensorCallback?.({ x: 0, y: 0 });
      });

      // Live reading well beyond +/- TILT_SENSITIVITY (0.5):
      //   x: 0.8  clamps to  0.5 -> gForceToParallax = 100 (max extreme)
      //   y: -0.8 clamps to -0.5 -> gForceToParallax = 0   (min extreme)
      // Without clamping these would be 130 and -30 respectively.
      act(() => {
        sensorCallback?.({ x: 0.8, y: -0.8 });
      });

      act(() => {
        rafCallback?.(0);
      });

      // smoothed = 50 + 0.04 * (100 - 50) = 52 ; 50 + 0.04 * (0 - 50) = 48
      expect(mockSetNumber).toHaveBeenCalledWith('xValue', expect.closeTo(52));
      expect(mockSetNumber).toHaveBeenCalledWith('yValue', expect.closeTo(48));
    });

    it('pushes the centered default to Rive on the first frame before any readings', () => {
      render(<MoneyFirstTimeDepositView />);

      // No sensor readings yet: targets are at their initial 50, so the first
      // smoothed frame stays centered: 50 + 0.04 * (50 - 50) = 50.
      act(() => {
        rafCallback?.(0);
      });

      expect(mockSetNumber).toHaveBeenCalledWith('xValue', 50);
      expect(mockSetNumber).toHaveBeenCalledWith('yValue', 50);
    });

    it('keeps the render loop scheduled after a setNumber error', () => {
      mockSetNumber.mockImplementationOnce(() => {
        throw new Error('Rive binding not ready');
      });

      render(<MoneyFirstTimeDepositView />);

      const rafSpy = global.requestAnimationFrame as jest.Mock;
      // Ignore the initial schedule queued during effect setup.
      rafSpy.mockClear();

      // setNumber throws on this frame; the catch must swallow it AND the loop
      // must still reschedule the next frame.
      expect(() => {
        act(() => {
          rafCallback?.(0);
        });
      }).not.toThrow();

      expect(rafSpy).toHaveBeenCalled();
    });

    it('still pushes the centered default when the accelerometer is unavailable', () => {
      (Accelerometer.addListener as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sensor unavailable');
      });

      expect(() => render(<MoneyFirstTimeDepositView />)).not.toThrow();

      // The render loop is set up after the sensor try/catch, so it still runs
      // and pushes the static center even though no listener was attached.
      act(() => {
        rafCallback?.(0);
      });

      expect(mockSetNumber).toHaveBeenCalledWith('xValue', 50);
      expect(mockSetNumber).toHaveBeenCalledWith('yValue', 50);
    });

    it('unsubscribes the sensor and cancels the frame on unmount', () => {
      const { unmount } = render(<MoneyFirstTimeDepositView />);
      const capturedRafCallback = rafCallback;

      // Cleanup: sets active = false, cancels the frame, removes the listener.
      unmount();

      expect(mockRemove).toHaveBeenCalled();
      expect(global.cancelAnimationFrame).toHaveBeenCalled();

      mockSetNumber.mockClear();
      const rafSpy = global.requestAnimationFrame as jest.Mock;
      rafSpy.mockClear();

      // A stale frame firing after unmount must not push to Rive, but it does
      // reschedule (the loop only stops once cancelAnimationFrame wins the race).
      act(() => {
        capturedRafCallback?.(0);
      });

      expect(mockSetNumber).not.toHaveBeenCalled();
      expect(rafSpy).toHaveBeenCalled();
    });

    describe('Platform axis sign', () => {
      // The same raw accelerometer delta must drive parallax in OPPOSITE
      // directions per platform, because iOS (CoreMotion) and Android
      // (SensorManager) report opposite signs for the same physical tilt.
      // Both runs: baseline {0, 0}, then an identical live reading {0.2, 0.2}.
      //   Android (sign +1): gForceToParallax(+0.2) = 70 -> EMA 50 + 0.04*(70-50) = 50.8
      //   iOS     (sign -1): gForceToParallax(-0.2) = 30 -> EMA 50 + 0.04*(30-50) = 49.2

      it('does not flip the sign on Android (raw +0.2 tilt pushes past center)', () => {
        Platform.OS = 'android';
        render(<MoneyFirstTimeDepositView />);

        // Calibration reading establishes baseline = {0, 0}.
        mockNow = 301;
        act(() => {
          sensorCallback?.({ x: 0, y: 0 });
        });

        // Live reading: raw +0.2 on both axes.
        act(() => {
          sensorCallback?.({ x: 0.2, y: 0.2 });
        });

        act(() => {
          rafCallback?.(0);
        });

        expect(mockSetNumber).toHaveBeenCalledWith(
          'xValue',
          expect.closeTo(50.8),
        );
        expect(mockSetNumber).toHaveBeenCalledWith(
          'yValue',
          expect.closeTo(50.8),
        );
      });

      it('flips the sign on iOS so the same raw tilt pushes the opposite way', () => {
        Platform.OS = 'ios';
        render(<MoneyFirstTimeDepositView />);

        // Calibration reading establishes baseline = {0, 0}.
        mockNow = 301;
        act(() => {
          sensorCallback?.({ x: 0, y: 0 });
        });

        // Identical live reading to the Android case: raw +0.2 on both axes.
        act(() => {
          sensorCallback?.({ x: 0.2, y: 0.2 });
        });

        act(() => {
          rafCallback?.(0);
        });

        expect(mockSetNumber).toHaveBeenCalledWith(
          'xValue',
          expect.closeTo(49.2),
        );
        expect(mockSetNumber).toHaveBeenCalledWith(
          'yValue',
          expect.closeTo(49.2),
        );
      });
    });
  });
});
