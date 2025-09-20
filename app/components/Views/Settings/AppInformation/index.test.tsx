import React from 'react';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AppInformation from './';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { useSupportConsent } from '../../../../components/hooks/useSupportConsent';

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

// Mock the useSupportConsent hook
jest.mock('../../../../components/hooks/useSupportConsent', () => ({
  useSupportConsent: jest.fn(() => ({
    openSupportWebPage: jest.fn(),
    handleConsent: jest.fn(),
    handleDecline: jest.fn(),
  })),
}));

const mockUseSupportConsent = useSupportConsent as jest.MockedFunction<
  typeof useSupportConsent
>;

// Mock device info
jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn().mockResolvedValue('MetaMask'),
  getVersion: jest.fn().mockResolvedValue('1.0.0'),
  getBuildNumber: jest.fn().mockResolvedValue('123'),
}));

describe('AppInformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders app information screen with navigation context', async () => {
    const component = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(component.toJSON()).toBeTruthy();
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('navigates to privacy policy when privacy policy link is pressed', async () => {
    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    // Wait for component to load and async state updates
    await waitFor(() => {
      expect(getByText(strings('app_information.privacy_policy'))).toBeTruthy();
    });

    const privacyPolicyLink = getByText(
      strings('app_information.privacy_policy'),
    );
    fireEvent.press(privacyPolicyLink);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: AppConstants.URLS.PRIVACY_POLICY,
          title: strings('app_information.privacy_policy'),
        },
      });
    });
  });

  it('navigates to terms of use when terms of use link is pressed', async () => {
    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    await waitFor(() => {
      expect(getByText(strings('app_information.terms_of_use'))).toBeTruthy();
    });

    const termsOfUseLink = getByText(strings('app_information.terms_of_use'));
    fireEvent.press(termsOfUseLink);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: AppConstants.URLS.TERMS_AND_CONDITIONS,
          title: strings('app_information.terms_of_use'),
        },
      });
    });
  });

  it('navigates to attributions when attributions link is pressed', async () => {
    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    await waitFor(() => {
      expect(getByText(strings('app_information.attributions'))).toBeTruthy();
    });

    const attributionsLink = getByText(strings('app_information.attributions'));
    fireEvent.press(attributionsLink);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: expect.stringMatching(
            /^https:\/\/raw\.githubusercontent\.com\/MetaMask\/metamask-mobile\/v.*\/attribution\.txt$/,
          ),
          title: strings('app_information.attributions'),
        },
      });
    });
  });

  it('navigates to website when website link is pressed', async () => {
    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    await waitFor(() => {
      expect(getByText(strings('app_information.web_site'))).toBeTruthy();
    });

    const websiteLink = getByText(strings('app_information.web_site'));
    fireEvent.press(websiteLink);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://metamask.io/',
          title: 'metamask.io',
        },
      });
    });
  });

  it('calls openSupportWebPage when support center link is pressed', async () => {
    const mockOpenSupportWebPage = jest.fn();
    mockUseSupportConsent.mockReturnValue({
      openSupportWebPage: mockOpenSupportWebPage,
      handleConsent: jest.fn(),
      handleDecline: jest.fn(),
    });

    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    await waitFor(() => {
      expect(getByText(strings('app_information.support_center'))).toBeTruthy();
    });

    const supportCenterLink = getByText(
      strings('app_information.support_center'),
    );
    fireEvent.press(supportCenterLink);

    expect(mockOpenSupportWebPage).toHaveBeenCalledTimes(1);
  });

  it('calls openSupportWebPage when contact us link is pressed', async () => {
    const mockOpenSupportWebPage = jest.fn();
    mockUseSupportConsent.mockReturnValue({
      openSupportWebPage: mockOpenSupportWebPage,
      handleConsent: jest.fn(),
      handleDecline: jest.fn(),
    });

    const { getByText } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );

    await waitFor(() => {
      expect(getByText(strings('app_information.contact_us'))).toBeTruthy();
    });

    const contactUsLink = getByText(strings('app_information.contact_us'));
    fireEvent.press(contactUsLink);

    expect(mockOpenSupportWebPage).toHaveBeenCalledTimes(1);
  });
});
