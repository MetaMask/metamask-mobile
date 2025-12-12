import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictNewButton from './PredictNewButton';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.tab.new_prediction': 'New prediction',
    };
    return mockStrings[key] || key;
  }),
}));

describe('PredictNewButton', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
  };

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('displays button with correct testID', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByTestId('predict-new-button')).toBeOnTheScreen();
    });

    it('uses correct localization key', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      renderWithProvider(<PredictNewButton />);

      expect(strings).toHaveBeenCalledWith('predict.tab.new_prediction');
    });
  });

  describe('navigation', () => {
    it('navigates to market list when pressed', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByTestId('predict-new-button');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: 'homepage_new_prediction',
          },
        },
      );
    });

    it('navigates on each press when pressed multiple times', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByTestId('predict-new-button');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
    });
  });
});
