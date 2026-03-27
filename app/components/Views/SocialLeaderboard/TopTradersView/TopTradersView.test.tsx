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

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TopTradersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    renderWithProvider(<TopTradersView />);
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.CONTAINER),
    ).toBeTruthy();
  });

  it('renders the Top Traders title', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Top Traders')).toBeTruthy();
  });

  it('renders the Top traders tab', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Top traders')).toBeTruthy();
  });

  it('renders the Following tab', () => {
    renderWithProvider(<TopTradersView />);
    expect(screen.getByText('Following')).toBeTruthy();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TopTradersView />);
    fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.BACK_BUTTON));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
