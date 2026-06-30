import React from 'react';
import { render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import MoneyFirstTimeDepositView from './MoneyFirstTimeDepositView';
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
let mockOnError: ((error: { message: string }) => void) | undefined;

jest.mock('rive-react-native', () => {
  const mockRiveRef = {};

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
    },
    AutoBind: (value: boolean) => ({ type: 'autobind', value }),
    Fit: { Layout: 'layout' },
    RNRiveError: class {},
  };
});

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
    it('navigates back when done trigger fires', () => {
      render(<MoneyFirstTimeDepositView />);

      mockTriggerCallbacks.done();

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('navigates back when Rive reports an error', () => {
      render(<MoneyFirstTimeDepositView />);

      mockOnError?.({ message: 'test rive error' });

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
