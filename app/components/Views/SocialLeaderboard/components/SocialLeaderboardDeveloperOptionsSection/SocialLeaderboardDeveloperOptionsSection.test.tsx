import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SocialLeaderboardDeveloperOptionsSection from './SocialLeaderboardDeveloperOptionsSection';
import { SocialLeaderboardDeveloperOptionsSectionSelectorsIDs } from './SocialLeaderboardDeveloperOptionsSection.testIds';
import {
  hasAcceptedSocialTerms,
  resetSocialTermsAcceptance,
} from '../../terms/socialTermsAcceptance';

jest.mock('../../terms/socialTermsAcceptance', () => ({
  hasAcceptedSocialTerms: jest.fn(),
  resetSocialTermsAcceptance: jest.fn(),
}));

const mockHasAccepted = jest.mocked(hasAcceptedSocialTerms);
const mockReset = jest.mocked(resetSocialTermsAcceptance);

describe('SocialLeaderboardDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset.mockResolvedValue(undefined);
  });

  it('shows the current Social Terms of Use state', () => {
    mockHasAccepted.mockReturnValue(true);

    const { getByText } = renderWithProvider(
      <SocialLeaderboardDeveloperOptionsSection />,
    );

    expect(getByText('Social Terms of Use accepted: true')).toBeOnTheScreen();
  });

  it('resets the terms acceptance and refreshes the readout when pressed', async () => {
    mockHasAccepted.mockReturnValueOnce(true).mockReturnValue(false);

    const { getByText, getByTestId } = renderWithProvider(
      <SocialLeaderboardDeveloperOptionsSection />,
    );

    expect(getByText('Social Terms of Use accepted: true')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        SocialLeaderboardDeveloperOptionsSectionSelectorsIDs.RESET_TERMS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
    expect(getByText('Social Terms of Use accepted: false')).toBeOnTheScreen();
  });
});
