import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MicaConsent, {
  formatConsentAddress,
  formatConsentDob,
} from './MicaConsent';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

const mockUserDetails = {
  firstName: 'John',
  lastName: 'Doe',
  dob: '1990-01-01',
  mobileNumber: '+4915123456789',
  address: {
    addressLine1: '123 Main St',
    city: 'Berlin',
    postCode: '10117',
    country: 'Germany',
    countryCode: 'DE',
  },
};

const mockGetUserDetails = jest.fn().mockResolvedValue(mockUserDetails);
const mockSubmitMicaConsent = jest
  .fn()
  .mockResolvedValue({ status: 'SUBMITTED' });

const mockGetKycRequirement = jest.fn();
const mockGetAdditionalRequirements = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    getUserDetails: mockGetUserDetails,
    submitMicaConsent: mockSubmitMicaConsent,
    getKycRequirement: mockGetKycRequirement,
    getAdditionalRequirements: mockGetAdditionalRequirements,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
const mockUseTransakRouting = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: (config: unknown) => {
    mockUseTransakRouting(config);
    return { routeAfterAuthentication: mockRouteAfterAuthentication };
  },
}));

const mockUseParamsReturn: {
  quote: { quoteId: string; fiatAmount: number };
  quoteId: string;
  headlessSessionId: string | undefined;
} = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
  quoteId: 'test-quote-id',
  headlessSessionId: undefined,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => mockUseParamsReturn,
  navigateWithDetails: (
    navigation: { navigate: (...args: unknown[]) => void },
    details: unknown[],
  ) => navigation.navigate(...details),
  resetWithRoutes: (
    navigation: { reset: (state: unknown) => void },
    _state: unknown,
  ) => navigation.reset(_state),
}));

describe('MicaConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.headlessSessionId = undefined;
    mockGetUserDetails.mockResolvedValue(mockUserDetails);
    mockSubmitMicaConsent.mockResolvedValue({ status: 'SUBMITTED' });
    mockGetKycRequirement.mockResolvedValue(undefined);
    mockGetAdditionalRequirements.mockResolvedValue(undefined);
  });

  const renderScreen = () =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

  const checkBothConsents = async (
    utils: ReturnType<typeof renderScreen>,
  ): Promise<void> => {
    await waitFor(() => {
      expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
    });
    fireEvent.press(utils.getByTestId('mica-consent-data-processing-checkbox'));
    fireEvent.press(utils.getByTestId('mica-consent-terms-checkbox'));
  };

  it('renders correctly', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.continueWithTransak')).toBeOnTheScreen();
    });
  });

  it('fetches and displays user details', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalled();
      expect(getByText('John Doe', { exact: false })).toBeOnTheScreen();
      expect(getByText('1 Jan 1990', { exact: false })).toBeOnTheScreen();
      expect(getByText(/123 Main St/)).toBeOnTheScreen();
      expect(getByText(/10117 Berlin, Germany/)).toBeOnTheScreen();
    });
  });

  it('formats a Transak ISO date of birth without shifting the day', () => {
    expect(formatConsentDob('1990-04-12T00:00:00.000Z', 'missing')).toBe(
      '12 Apr 1990',
    );
    expect(formatConsentDob(undefined, 'missing')).toBe('missing');
  });

  it('formats the address as street, then postcode city and country', () => {
    expect(
      formatConsentAddress({
        addressLine1: 'Friedrichstrasse 10',
        addressLine2: '',
        state: 'Berlin',
        city: 'Berlin',
        postCode: '10117',
        country: 'Germany',
        countryCode: 'DE',
      }),
    ).toBe('Friedrichstrasse 10\n10117 Berlin, Germany');
  });

  it('disables submit button until both consents are checked', async () => {
    const { getByText, getByLabelText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.mica_consent.data_processing_consent'),
      ).toBeOnTheScreen();
    });

    const button = getByLabelText('deposit.mica.agreeAndContinue');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables submit once both design system checkboxes are checked', async () => {
    const { getByTestId, getByLabelText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByTestId('mica-consent-data-processing-checkbox'),
      ).toBeOnTheScreen();
    });

    const button = () => getByLabelText('deposit.mica.agreeAndContinue');
    expect(button().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByTestId('mica-consent-data-processing-checkbox'));
    expect(button().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByTestId('mica-consent-terms-checkbox'));
    expect(button().props.accessibilityState?.disabled).toBe(false);
  });

  it('renders the user data labels in a bold weight and the values in regular', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );
    await waitFor(() => {
      expect(getByText(/John Doe/)).toBeOnTheScreen();
    });

    const fontFamily = (node: ReturnType<typeof getByText>) =>
      StyleSheet.flatten(node.props.style)?.fontFamily;

    [
      /deposit\.mica\.name/,
      /deposit\.mica\.dob/,
      /deposit\.mica_consent\.address_label/,
      /deposit\.mica_consent\.mobile_number_label/,
    ].forEach((label) => {
      expect(fontFamily(getByText(label))).toBe('Inter-SemiBold');
    });
    expect(fontFamily(getByText(/John Doe/))).toBe('Inter-Regular');
  });

  it('exposes accessible labels and checked state on the checkboxes', async () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByTestId('mica-consent-data-processing-checkbox'),
      ).toBeOnTheScreen();
    });

    const dataProcessing = getByTestId('mica-consent-data-processing-checkbox');
    expect(dataProcessing.props.accessibilityLabel).toBe(
      'deposit.mica_consent.data_processing_consent',
    );
    expect(dataProcessing.props.accessibilityState?.checked).toBe(false);

    fireEvent.press(dataProcessing);
    expect(
      getByTestId('mica-consent-data-processing-checkbox').props
        .accessibilityState?.checked,
    ).toBe(true);
    expect(
      getByTestId('mica-consent-terms-checkbox').props.accessibilityLabel,
    ).toContain('deposit.mica_consent.terms_link_text');
  });

  it('renders consent checkboxes with linked text', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.mica_consent.data_processing_consent'),
      ).toBeOnTheScreen();
      expect(
        getByText('deposit.mica_consent.terms_link_text'),
      ).toBeOnTheScreen();
      expect(
        getByText('deposit.mica_consent.privacy_link_text'),
      ).toBeOnTheScreen();
    });
  });

  it('renders agree and continue button', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.agreeAndContinue')).toBeOnTheScreen();
    });
  });

  it('keeps submit disabled when the user details fail to load', async () => {
    mockGetUserDetails.mockRejectedValue(new Error('details unavailable'));
    const utils = renderScreen();

    await waitFor(() => {
      expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    });
    fireEvent.press(utils.getByTestId('mica-consent-data-processing-checkbox'));
    fireEvent.press(utils.getByTestId('mica-consent-terms-checkbox'));

    expect(
      utils.getByLabelText('deposit.mica.agreeAndContinue').props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('submits consent and continues the KYC flow', async () => {
    const utils = renderScreen();
    await checkBothConsents(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('deposit.mica.agreeAndContinue'));
    });

    expect(mockSubmitMicaConsent).toHaveBeenCalledWith(expect.any(String));
    expect(mockGetKycRequirement).toHaveBeenCalledWith('test-quote-id');
    expect(mockGetAdditionalRequirements).toHaveBeenCalledWith('test-quote-id');
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(
      mockUseParamsReturn.quote,
    );
  });

  it('shows an error and does not continue when consent submission fails', async () => {
    mockSubmitMicaConsent.mockResolvedValue({ status: 'FAILED' });
    const utils = renderScreen();
    await checkBothConsents(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('deposit.mica.agreeAndContinue'));
    });

    expect(
      utils.getByText('deposit.mica.consentSubmitError'),
    ).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('shows an error when consent submission throws', async () => {
    mockSubmitMicaConsent.mockRejectedValue(new Error('boom'));
    const utils = renderScreen();
    await checkBothConsents(utils);

    await act(async () => {
      fireEvent.press(utils.getByLabelText('deposit.mica.agreeAndContinue'));
    });

    expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('routes back to the headless host when a headless session is active', async () => {
    mockUseParamsReturn.headlessSessionId = 'headless-1';

    const utils = renderScreen();
    await waitFor(() => {
      expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
    });

    expect(mockUseTransakRouting).toHaveBeenCalledWith(
      expect.objectContaining({
        baseRoute: 'RampHeadlessHost',
        baseRouteParams: { headlessSessionId: 'headless-1' },
      }),
    );
  });

  it('does not override the base route outside headless flows', async () => {
    const utils = renderScreen();
    await waitFor(() => {
      expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
    });

    expect(mockUseTransakRouting.mock.calls[0][0].baseRoute).toBeUndefined();
  });

  describe('retry after a failed details fetch', () => {
    it('shows a retry action and loads the details when retried', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('network down'));
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
      });
      expect(
        utils.queryByText('deposit.mica.loadingDetails'),
      ).not.toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(utils.getByText('deposit.mica.retry_button'));
      });

      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });
      expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
      expect(
        utils.queryByText('deposit.mica.errorTitle'),
      ).not.toBeOnTheScreen();
      expect(mockSubmitMicaConsent).not.toHaveBeenCalled();
    });

    it('keeps the retry action when the details fetch fails again', async () => {
      mockGetUserDetails.mockRejectedValue(new Error('still down'));
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('deposit.mica.retry_button')).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.press(utils.getByText('deposit.mica.retry_button'));
      });

      expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
      expect(utils.getByText('deposit.mica.retry_button')).toBeOnTheScreen();
    });
  });

  describe('retry after a failed submission', () => {
    const submitOnce = async (utils: ReturnType<typeof renderScreen>) => {
      await checkBothConsents(utils);
      await act(async () => {
        fireEvent.press(utils.getByLabelText('deposit.mica.agreeAndContinue'));
      });
    };

    it('resubmits with the originally captured consent timestamp', async () => {
      mockSubmitMicaConsent.mockRejectedValueOnce(new Error('boom'));
      const utils = renderScreen();
      await submitOnce(utils);
      const firstTimestamp = mockSubmitMicaConsent.mock.calls[0][0];

      await act(async () => {
        fireEvent.press(utils.getByText('deposit.mica.retry_button'));
      });

      expect(mockSubmitMicaConsent).toHaveBeenCalledTimes(2);
      expect(mockSubmitMicaConsent).toHaveBeenLastCalledWith(firstTimestamp);
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(
        mockUseParamsReturn.quote,
      );
    });

    it('shows the submit error when the retry reports a failed status', async () => {
      mockSubmitMicaConsent.mockRejectedValueOnce(new Error('boom'));
      const utils = renderScreen();
      await submitOnce(utils);
      mockSubmitMicaConsent.mockResolvedValueOnce({ status: 'FAILED' });

      await act(async () => {
        fireEvent.press(utils.getByText('deposit.mica.retry_button'));
      });

      expect(
        utils.getByText('deposit.mica.consentSubmitError'),
      ).toBeOnTheScreen();
      expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    });

    it('shows an error when the retry throws', async () => {
      mockSubmitMicaConsent.mockRejectedValue(new Error('still down'));
      const utils = renderScreen();
      await submitOnce(utils);

      await act(async () => {
        fireEvent.press(utils.getByText('deposit.mica.retry_button'));
      });

      expect(utils.getByText('deposit.mica.errorTitle')).toBeOnTheScreen();
      expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    });
  });

  describe('external links', () => {
    let openURL: jest.SpyInstance;

    beforeEach(() => {
      openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    });

    afterEach(() => {
      openURL.mockRestore();
    });

    it('renders the support notice as a single sentence ending after the link', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      expect(
        utils.getByText(
          /^deposit\.mica_consent\.support_notice_prefix deposit\.mica_consent\.support_link_textdeposit\.mica_consent\.support_notice_suffix$/,
        ),
      ).toBeOnTheScreen();
    });

    it('opens Transak support from the support notice', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      fireEvent.press(
        utils.getByText('deposit.mica_consent.support_link_text'),
      );

      expect(openURL).toHaveBeenCalledWith('https://support.transak.com');
    });

    it('opens the Transak terms of service from the consent label', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      fireEvent.press(utils.getByText('deposit.mica_consent.terms_link_text'));

      expect(openURL).toHaveBeenCalledWith(
        'https://transak.com/terms-of-service',
      );
    });

    it('does not toggle the terms consent when a consent link is pressed', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });
      const checkbox = utils.getByTestId('mica-consent-terms-checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(false);

      fireEvent.press(utils.getByText('deposit.mica_consent.terms_link_text'));
      fireEvent.press(
        utils.getByText('deposit.mica_consent.privacy_link_text'),
      );

      expect(
        utils.getByTestId('mica-consent-terms-checkbox').props
          .accessibilityState.checked,
      ).toBe(false);
    });

    it('opens the Transak privacy policy from the consent label', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      fireEvent.press(
        utils.getByText('deposit.mica_consent.privacy_link_text'),
      );

      expect(openURL).toHaveBeenCalledWith(
        expect.stringContaining('transak.com'),
      );
    });
  });

  it('returns an unparseable date of birth unchanged', () => {
    expect(formatConsentDob('not-a-date', 'missing')).toBe('not-a-date');
  });

  it('returns an empty string when there is no address', () => {
    expect(formatConsentAddress(undefined)).toBe('');
  });

  it('navigates back from the header buttons', async () => {
    const utils = renderScreen();
    await waitFor(() => {
      expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
    });

    fireEvent.press(utils.getByTestId('deposit-back-navbar-button'));
    fireEvent.press(utils.getByTestId('deposit-close-navbar-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(2);
  });
});
