import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import { getBetaSupportUrl } from '../../../../util/support/betaSupportUrl';
import SocialAccountDisabledBanner from './SocialAccountDisabledBanner';
import { SocialAccountDisabledBannerSelectorsIDs } from './SocialAccountDisabledBanner.testIds';
import { useSocialModerationStatus } from '../hooks/useSocialModerationStatus';

const mockNavigate = jest.fn();
const mockOpenSupportWithConsent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

jest.mock('../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: jest.fn(),
}));

jest.mock('../hooks/useSocialModerationStatus', () => ({
  useSocialModerationStatus: jest.fn(),
}));

const mockUseStatus = useSocialModerationStatus as jest.Mock;
const mockGetBetaSupportUrl = getBetaSupportUrl as jest.Mock;

describe('SocialAccountDisabledBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBetaSupportUrl.mockReturnValue(undefined);
  });

  it('renders nothing while the viewer is not banned', () => {
    mockUseStatus.mockReturnValue({ isBanned: false, reason: null });

    renderWithProvider(<SocialAccountDisabledBanner />);

    expect(
      screen.queryByTestId(SocialAccountDisabledBannerSelectorsIDs.BANNER),
    ).toBeNull();
  });

  it('tells a banned viewer their account is disabled, why, and how to reach support', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: 'Spam or scams' });

    renderWithProvider(<SocialAccountDisabledBanner />);

    expect(
      screen.getByText('Your account is temporarily disabled'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Reason: Spam or scams')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Contact support at support@metamask.io or in the app for help.',
      ),
    ).toBeOnTheScreen();
  });

  it('leaves the reason out when there is none', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });

    renderWithProvider(<SocialAccountDisabledBanner />);

    expect(
      screen.getByTestId(SocialAccountDisabledBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/^Reason:/)).toBeNull();
  });

  it('opens support with the consent sheet', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });
    renderWithProvider(<SocialAccountDisabledBanner />);

    fireEvent.press(screen.getByText('Contact support'));

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
    );
    const openWebview = mockOpenSupportWithConsent.mock.calls[0][0];
    openWebview('https://support.metamask.io/?x=1');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://support.metamask.io/?x=1',
        title: expect.any(String),
      },
    });
  });

  it('opens the beta support site directly on beta builds', () => {
    mockUseStatus.mockReturnValue({ isBanned: true, reason: null });
    mockGetBetaSupportUrl.mockReturnValue('https://beta.support');
    renderWithProvider(<SocialAccountDisabledBanner />);

    fireEvent.press(screen.getByText('Contact support'));

    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WEBVIEW.MAIN,
      expect.objectContaining({
        params: expect.objectContaining({ url: 'https://beta.support' }),
      }),
    );
  });
});
