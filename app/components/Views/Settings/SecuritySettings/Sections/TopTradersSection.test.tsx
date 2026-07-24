import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';
import TopTradersSection from './TopTradersSection';

const mockMessengerCall = jest.fn().mockResolvedValue(undefined);
const mockLoggerError = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});
let mockLeaderboardEnabled = true;
let mockOptFlowEnabled = true;

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockMessengerCall(...args),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: (...args: unknown[]) => mockLoggerError(...args),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockLeaderboardEnabled,
    selectSocialLeaderboardOptFlowEnabled: () => mockOptFlowEnabled,
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
    mockOptFlowEnabled = true;
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

  it('renders nothing when the leaderboard opt-flow flag is disabled', () => {
    mockOptFlowEnabled = false;
    renderWith(true);

    expect(
      screen.queryByTestId(SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION),
    ).toBeNull();
  });

  it('opts out and reflects the toggle off after the backend confirms', async () => {
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() =>
      expect(mockMessengerCall).toHaveBeenCalledWith(
        'SocialController:optOutOfLeaderboard',
      ),
    );
    // Persisted only after the backend confirms, not optimistically.
    await waitFor(() => expect(toggle.props.value).toBe(false));
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

  it('tracks the visibility-toggled event on a successful opt-out', async () => {
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() =>
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_VISIBILITY_TOGGLED,
      ),
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      show_account_on_leaderboard: false,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks the visibility-toggled event on a successful opt-in', async () => {
    renderWith(false);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', true);

    await waitFor(() =>
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_VISIBILITY_TOGGLED,
      ),
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      show_account_on_leaderboard: true,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('logs and leaves the toggle unchanged when the request fails', async () => {
    mockMessengerCall.mockRejectedValueOnce(new Error('network down'));
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    // Never persisted optimistically, so nothing to revert — stays as it was.
    expect(toggle.props.value).toBe(true);
  });

  it('does not track the event when the request fails', async () => {
    mockMessengerCall.mockRejectedValueOnce(new Error('network down'));
    renderWith(true);
    const toggle = screen.getByTestId(
      SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE,
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
