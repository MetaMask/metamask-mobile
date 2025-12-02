import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictPositionEmpty from './PredictPositionEmpty';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('PredictPositionEmpty', () => {
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
    it('displays empty state message and browse button', () => {
      renderWithProvider(<PredictPositionEmpty />);

      expect(
        screen.getByText(
          'Your predictions will appear here, showing your stake and market movement.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Browse markets')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to market list when browse button is pressed', () => {
      renderWithProvider(<PredictPositionEmpty />);

      fireEvent.press(screen.getByText('Browse markets'));

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: 'homepage_positions',
          },
        },
      );
    });
  });
});
