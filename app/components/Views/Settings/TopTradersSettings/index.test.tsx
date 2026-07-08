import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TopTradersSettings from './';
import { TopTradersSettingsSelectorsIDs } from './TopTradersSettings.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  };
});

describe('TopTradersSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the opt-out row', () => {
    renderWithProvider(<TopTradersSettings />);

    expect(
      screen.getByTestId(TopTradersSettingsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersSettingsSelectorsIDs.OPT_OUT_ROW),
    ).toBeOnTheScreen();
  });

  it('opens the opt-out sheet when the opt-out row is pressed', () => {
    renderWithProvider(<TopTradersSettings />);

    fireEvent.press(
      screen.getByTestId(TopTradersSettingsSelectorsIDs.OPT_OUT_ROW),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.OPT_OUT,
    );
  });

  it('navigates back when the back button is pressed', () => {
    renderWithProvider(<TopTradersSettings />);

    fireEvent.press(
      screen.getByTestId(TopTradersSettingsSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
