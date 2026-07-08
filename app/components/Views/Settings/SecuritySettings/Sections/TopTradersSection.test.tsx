import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import TopTradersSection from './TopTradersSection';

const mockMessengerCall = jest.fn().mockResolvedValue(undefined);
const mockLoggerError = jest.fn();
let mockLeaderboardEnabled = true;

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockMessengerCall(...args),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: (...args: unknown[]) => mockLoggerError(...args),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockLeaderboardEnabled,
  }),
);

const renderWith = (showAccountOnLeaderboard = true) =>
  renderWithProvider(<TopTradersSection />, {
    state: { settings: { showAccountOnLeaderboard } },
  });

describe('TopTradersSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardEnabled = true;
    mockMessengerCall.mockResolvedValue(undefined);
  });

  it('renders the section and toggle when the leaderboard is enabled', () => {
    renderWith(true);

    expect(
      screen.getByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('social_leaderboard.settings.show_account_on_leaderboard'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
      ).props.value,
    ).toBe(true);
  });

  it('renders nothing when the leaderboard feature is disabled', () => {
    mockLeaderboardEnabled = false;
    renderWith(true);

    expect(
      screen.queryByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).toBeNull();
  });

  it('opts out (and flips the toggle off) when turned off', async () => {
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    expect(toggle.props.value).toBe(false);
    await waitFor(() =>
      expect(mockMessengerCall).toHaveBeenCalledWith(
        'SocialController:optOutOfLeaderboard',
      ),
    );
  });

  it('opts in when turned on', async () => {
    renderWith(false);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', true);

    await waitFor(() =>
      expect(mockMessengerCall).toHaveBeenCalledWith(
        'SocialController:optInToLeaderboard',
      ),
    );
  });

  it('reverts and logs when the request fails', async () => {
    mockMessengerCall.mockRejectedValueOnce(new Error('network down'));
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    expect(toggle.props.value).toBe(true);
  });
});
