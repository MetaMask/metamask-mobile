import { StackActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictPositionsEmptySelectorsIDs } from '../../Predict.testIds';
import PredictPositionsEmpty from './PredictPositionsEmpty';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../images/predictions-dark.svg', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return (props: Record<string, unknown>) =>
    ReactLib.createElement(View, props);
});

jest.mock('../../../../../images/predictions-light.svg', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return (props: Record<string, unknown>) =>
    ReactLib.createElement(View, props);
});

const mockNavigation = {
  canGoBack: jest.fn(),
  dispatch: jest.fn(),
  navigate: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.Mock;

describe('PredictPositionsEmpty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.canGoBack.mockReturnValue(true);
    mockUseNavigation.mockReturnValue(mockNavigation);
  });

  it('renders the Positions empty state content', () => {
    render(<PredictPositionsEmpty />);

    expect(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.ICON),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Your predictions will appear here, showing your stake and market movements',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Browse markets')).toBeOnTheScreen();
  });

  it('pops to the Predict market list when the stack can go back', () => {
    render(<PredictPositionsEmpty />);

    fireEvent.press(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.BROWSE_MARKETS_CTA),
    );

    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      StackActions.popToTop(),
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the Predict market list when there is no stack to pop', () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    render(<PredictPositionsEmpty />);

    fireEvent.press(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.BROWSE_MARKETS_CTA),
    );

    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.PREDICT.MARKET_LIST,
    );
  });
});
