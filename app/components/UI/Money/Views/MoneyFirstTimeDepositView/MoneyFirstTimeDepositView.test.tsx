import React from 'react';
import { render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
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

jest.mock(
  '../../../../../animations/money_account_first_time_deposit_with_parallax.riv',
  () => 1,
  { virtual: true },
);

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('MoneyFirstTimeDepositView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerCallbacks = {};
    mockOnError = undefined;
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackScreenViewed: mockTrackScreenViewed,
    });
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
  });
});
