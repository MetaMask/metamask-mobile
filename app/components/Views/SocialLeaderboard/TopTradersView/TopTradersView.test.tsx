import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TopTradersView from './TopTradersView';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
  };
});

describe('TopTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the Top Traders title', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Top Traders')).toBeOnTheScreen();
  });

  it('renders the search button', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.BACK_BUTTON));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles search button press without error', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(
      screen.getByTestId(TopTradersViewSelectorsIDs.SEARCH_BUTTON),
    );
  });
});
