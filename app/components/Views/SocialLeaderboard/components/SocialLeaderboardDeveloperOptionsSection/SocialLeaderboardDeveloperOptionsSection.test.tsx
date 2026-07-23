import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SocialLeaderboardDeveloperOptionsSection from './SocialLeaderboardDeveloperOptionsSection';
import { SocialLeaderboardDeveloperOptionsSectionSelectorsIDs } from './SocialLeaderboardDeveloperOptionsSection.testIds';
import {
  hasSeenSocialLeaderboardOnboarding,
  resetSocialLeaderboardOnboardingSeen,
} from '../../Onboarding/socialLeaderboardOnboardingNavigation';

jest.mock('../../Onboarding/socialLeaderboardOnboardingNavigation', () => ({
  hasSeenSocialLeaderboardOnboarding: jest.fn(),
  resetSocialLeaderboardOnboardingSeen: jest.fn(),
}));

const mockHasSeen = jest.mocked(hasSeenSocialLeaderboardOnboarding);
const mockReset = jest.mocked(resetSocialLeaderboardOnboardingSeen);

describe('SocialLeaderboardDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset.mockResolvedValue(undefined);
  });

  it('shows the current onboarding-seen state', () => {
    mockHasSeen.mockReturnValue(true);

    const { getByText } = renderWithProvider(
      <SocialLeaderboardDeveloperOptionsSection />,
    );

    expect(getByText('Onboarding seen: true')).toBeOnTheScreen();
  });

  it('resets the onboarding state and refreshes the readout when pressed', async () => {
    mockHasSeen.mockReturnValueOnce(true).mockReturnValue(false);

    const { getByText, getByTestId } = renderWithProvider(
      <SocialLeaderboardDeveloperOptionsSection />,
    );

    expect(getByText('Onboarding seen: true')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        SocialLeaderboardDeveloperOptionsSectionSelectorsIDs.RESET_ONBOARDING_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
    expect(getByText('Onboarding seen: false')).toBeOnTheScreen();
  });
});
