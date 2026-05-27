import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
import PredictPositionsView from './PredictPositionsView';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.createAnimatedComponent = (
    Component: React.ComponentType,
  ) => Component;
  return Reanimated;
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

const mockNavigation = {
  canGoBack: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseRoute = useRoute as jest.Mock;

const renderScreen = (initialTab?: 'positions' | 'history') => {
  mockUseRoute.mockReturnValue({
    params: initialTab ? { initialTab } : undefined,
  });

  return render(<PredictPositionsView />);
};

describe('PredictPositionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.canGoBack.mockReturnValue(true);
    mockUseNavigation.mockReturnValue(mockNavigation);
  });

  it('renders the fixed header, summary placeholder, tabs, and positions tab by default', () => {
    renderScreen();

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.SUMMARY),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.TABS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.POSITIONS_TAB),
    ).toBeOnTheScreen();
    expect(screen.getByText('Active positions')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT,
      ),
    ).toBeNull();
  });

  it('uses the initial history tab from route params', () => {
    renderScreen('history');

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeNull();
  });

  it('switches between Positions and History tabs', () => {
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB),
    );

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.POSITIONS_TAB),
    );

    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed and the stack can go back', () => {
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('returns to the Predict market list when the stack cannot go back', () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.PREDICT.MARKET_LIST,
    );
  });
});
