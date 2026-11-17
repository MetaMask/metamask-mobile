import React from 'react';
import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyFirstTimeDepositView from './MoneyFirstTimeDepositView';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { SCREEN_NAMES } from '../../constants/moneyEvents';
import { MoneyFirstTimeDepositViewTestIds } from './MoneyFirstTimeDepositView.testIds';
import { PARALLAX_REST_VALUE } from '../../utils/parallax';
import {
  __fireRiveTrigger,
  __getRivePropertySetter,
  __resetRiveMocks,
} from '../../../../../__mocks__/rive-app-react-native';

const mockNavigate = jest.fn();
const mockTrackScreenViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

let mockParallaxFlagEnabled = true;
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => {
    const {
      selectMoneyParallaxAnimationEnabledFlag,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('../../selectors/featureFlags');
    if (selector === selectMoneyParallaxAnimationEnabledFlag) {
      return mockParallaxFlagEnabled;
    }
    return undefined;
  },
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useMountEffect', () => ({
  __esModule: true,
  default: (fn: () => void) => fn(),
}));

// Local wrapper around the global Nitro Rive mock: captures the RiveView
// props (onError) and lets tests withhold the view-model instance.
let mockInstanceReady = true;
const mockRiveViewProps: {
  current?: { onError?: (error: RiveError) => void };
} = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: { onError?: (error: RiveError) => void }) => {
    mockRiveViewProps.current = props;
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    useViewModelInstance: (source?: unknown, params?: unknown) =>
      mockInstanceReady
        ? actual.useViewModelInstance(source, params)
        : { instance: null, isLoading: true, error: null },
    RiveView: MockRiveView,
  };
});

/** Runs the tilt callback the view handed to `useDeviceOrientation`. */
const emitTilt = (x: number, y: number) => {
  const [onOrientation] = (useDeviceOrientation as jest.Mock).mock.calls[0];
  onOrientation(x, y);
};

/** The `enabled` option the view passed to `useDeviceOrientation`. */
const tiltSubscriptionEnabled = (): boolean => {
  const [, options] = (useDeviceOrientation as jest.Mock).mock.calls[0];
  return options.enabled;
};

describe('MoneyFirstTimeDepositView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockParallaxFlagEnabled = true;
    mockInstanceReady = true;

    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackScreenViewed: mockTrackScreenViewed,
    });
    (useReduceMotion as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the Rive animation component', () => {
      const { getByTestId } = render(<MoneyFirstTimeDepositView />);

      expect(
        getByTestId(MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION),
      ).toBeOnTheScreen();
    });

    it('does not render the Rive animation until the view-model instance is ready', () => {
      mockInstanceReady = false;

      const { queryByTestId } = render(<MoneyFirstTimeDepositView />);

      expect(
        queryByTestId(MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION),
      ).toBeNull();
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
    it('sets title, content and button strings on mount', () => {
      render(<MoneyFirstTimeDepositView />);

      expect(__getRivePropertySetter('title')).toHaveBeenCalledWith(
        strings('money.first_time_deposit.title'),
      );
      expect(__getRivePropertySetter('content')).toHaveBeenCalledWith(
        strings('money.first_time_deposit.content'),
      );
      expect(__getRivePropertySetter('button')).toHaveBeenCalledWith(
        strings('money.first_time_deposit.button_text'),
      );
    });
  });

  describe('Done trigger', () => {
    it('navigates back when done trigger fires', () => {
      render(<MoneyFirstTimeDepositView />);

      act(() => __fireRiveTrigger('done'));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('navigates back when Rive reports an error', () => {
      render(<MoneyFirstTimeDepositView />);

      act(() =>
        mockRiveViewProps.current?.onError?.({
          message: 'test rive error',
          type: RiveErrorType.Unknown,
        }),
      );

      expect(mockNavigate).toHaveBeenCalledTimes(1);
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

    it('navigates back and returns true when hardware back is pressed', () => {
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
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parallax', () => {
    it('subscribes to device tilt when the flag is on and motion is allowed', () => {
      render(<MoneyFirstTimeDepositView />);

      expect(tiltSubscriptionEnabled()).toBe(true);
    });

    it('does not subscribe to device tilt when the parallax flag is off', () => {
      mockParallaxFlagEnabled = false;

      render(<MoneyFirstTimeDepositView />);

      expect(tiltSubscriptionEnabled()).toBe(false);
    });

    it('does not subscribe to device tilt when reduce motion is enabled', () => {
      (useReduceMotion as jest.Mock).mockReturnValue(true);

      render(<MoneyFirstTimeDepositView />);

      expect(tiltSubscriptionEnabled()).toBe(false);
    });

    it('centres both parallax axes for a device at rest', () => {
      render(<MoneyFirstTimeDepositView />);

      emitTilt(0, 0);

      expect(__getRivePropertySetter('xValue')).toHaveBeenCalledWith(
        PARALLAX_REST_VALUE,
      );
      expect(__getRivePropertySetter('yValue')).toHaveBeenCalledWith(
        PARALLAX_REST_VALUE,
      );
    });

    it('drives the horizontal axis in the same direction as the roll', () => {
      render(<MoneyFirstTimeDepositView />);

      emitTilt(1, 0);

      expect(__getRivePropertySetter('xValue')).toHaveBeenCalledWith(100);
    });

    it('drives the vertical axis opposite to the pitch, matching the artboard travel', () => {
      render(<MoneyFirstTimeDepositView />);

      emitTilt(0, 1);

      expect(__getRivePropertySetter('yValue')).toHaveBeenCalledWith(0);
    });
  });

  describe('Teardown', () => {
    it('removes the BackHandler listener on unmount so no work survives the screen', () => {
      const mockRemove = jest.fn();
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockReturnValue({ remove: mockRemove });

      const { unmount } = render(<MoneyFirstTimeDepositView />);
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
