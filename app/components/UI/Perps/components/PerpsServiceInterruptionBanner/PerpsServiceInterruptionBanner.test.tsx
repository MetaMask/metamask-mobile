import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsServiceInterruptionBanner from './PerpsServiceInterruptionBanner';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import { SUPPORT_CONFIG } from '../../constants/perpsConfig';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

const { useSelector } = jest.requireMock('react-redux');

describe('PerpsServiceInterruptionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when flag is disabled', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return false;
      }
      return undefined;
    });

    const { queryByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(queryByTestId('perps-service-interruption-banner')).toBeNull();
  });

  it('renders banner when flag is enabled', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(getByTestId('perps-service-interruption-banner')).toBeOnTheScreen();
  });

  it('displays outage title and description', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByText } = render(<PerpsServiceInterruptionBanner />);

    expect(getByText("We're experiencing an outage")).toBeOnTheScreen();
    expect(getByText(/Some services may be unavailable/)).toBeOnTheScreen();
    expect(getByText('Contact support')).toBeOnTheScreen();
  });

  it('shows the support consent sheet with the support URL when the support link is pressed', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByText } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(getByText('Contact support'));

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      SUPPORT_CONFIG.Url,
    );
  });

  // Covers only the call-site opener glue: invoking the opener passed to
  // openSupportWithConsent navigates to the webview. The consent modal
  // behavior itself is covered by the core support-consent tests.
  it('navigates to the SimpleWebview when the provided opener is invoked', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByText } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(getByText('Contact support'));
    const [open] = mockOpenSupportWithConsent.mock.calls[0];
    open(SUPPORT_CONFIG.Url);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: SUPPORT_CONFIG.Url,
        title: strings(SUPPORT_CONFIG.TitleKey),
      },
    });
  });

  it('uses custom testID when provided', () => {
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = render(
      <PerpsServiceInterruptionBanner testID="custom-banner" />,
    );

    expect(getByTestId('custom-banner')).toBeOnTheScreen();
  });
});
