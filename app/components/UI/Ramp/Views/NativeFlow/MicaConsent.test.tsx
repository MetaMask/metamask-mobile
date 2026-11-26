import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MicaConsent, {
  formatConsentAddress,
  formatConsentDob,
} from './MicaConsent';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';

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
const mockLayoutProps = jest.fn();

jest.mock('./MicaKycFormLayout', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../testUtils/micaKycMocks').mockMicaKycFormLayout(
    (props: Record<string, unknown>) => mockLayoutProps(props),
  ),
);

jest.mock('../../hooks/useTransakRouting', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../testUtils/micaKycMocks').mockTransakRoutingModule(() => ({
    onConfig: mockUseTransakRouting,
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
);

const mockUseParamsReturn: {
  quote: { quoteId: string; fiatAmount: number };
  quoteId: string;
  headlessSessionId: string | undefined;
} = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
  quoteId: 'test-quote-id',
  headlessSessionId: undefined,
};

jest.mock('../../../../../util/navigation/navUtils', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../testUtils/micaKycMocks').mockNavUtilsModule(
    () => mockUseParamsReturn,
  ),
);

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
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('deposit.mica.continueWithTransak')).toBeOnTheScreen();
    });
  });

  it('fetches and displays user details', async () => {
    const { getByText } = renderScreen();

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
    const { getByText, getByLabelText } = renderScreen();

    await waitFor(() => {
      expect(
        getByText('deposit.mica_consent.data_processing_consent'),
      ).toBeOnTheScreen();
    });

    const button = getByLabelText('deposit.mica.agreeAndContinue');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables submit once both design system checkboxes are checked', async () => {
    const { getByTestId, getByLabelText } = renderScreen();

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
    const { getByText } = renderScreen();
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
    const { getByTestId } = renderScreen();

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
    const { getByText } = renderScreen();

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
    const { getByText } = renderScreen();

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

    it('opens the Transak MiCA support page from the support notice', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      fireEvent.press(
        utils.getByText('deposit.mica_consent.support_link_text'),
      );

      expect(openURL).toHaveBeenCalledWith(
        'https://support.transak.com/en/mica',
      );
    });

    it('opens the Transak terms of service from the consent label', async () => {
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      fireEvent.press(utils.getByText('deposit.mica_consent.terms_link_text'));

      expect(openURL).toHaveBeenCalledWith(
        'https://www.transak.com/terms-of-service',
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

  it('formats address with the country code when the country name is absent', () => {
    expect(
      formatConsentAddress({
        addressLine1: 'Rue de Rivoli 1',
        addressLine2: 'Floor 2',
        state: '',
        city: 'Paris',
        postCode: '75001',
        country: '',
        countryCode: 'FR',
      }),
    ).toBe('Rue de Rivoli 1, Floor 2\n75001 Paris, FR');
  });

  it('formats an address that only has a street', () => {
    expect(
      formatConsentAddress({
        addressLine1: 'Friedrichstrasse 10',
      } as unknown as Parameters<typeof formatConsentAddress>[0]),
    ).toBe('Friedrichstrasse 10');
  });

  it('shows "not provided" for missing date of birth, address and mobile number', async () => {
    mockGetUserDetails.mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Roe',
    });
    const utils = renderScreen();

    await waitFor(() => {
      expect(utils.getByText(/Jane Roe/)).toBeOnTheScreen();
    });

    expect(
      utils.getByText(/deposit\.mica\.dob:\s+deposit\.mica\.notProvided/),
    ).toBeOnTheScreen();
    expect(
      utils.getByText(
        /deposit\.mica_consent\.address_label:\s+deposit\.mica\.notProvided/,
      ),
    ).toBeOnTheScreen();
    expect(
      utils.getByText(
        /deposit\.mica_consent\.mobile_number_label:\s+deposit\.mica\.notProvided/,
      ),
    ).toBeOnTheScreen();
  });

  describe('consent timestamp', () => {
    let timezoneSpy: jest.SpyInstance;

    beforeEach(() => {
      timezoneSpy = jest.spyOn(Date.prototype, 'getTimezoneOffset');
    });

    afterEach(() => {
      timezoneSpy.mockRestore();
    });

    const submittedTimestamp = async (): Promise<string> => {
      const utils = renderScreen();
      await checkBothConsents(utils);
      await act(async () => {
        fireEvent.press(utils.getByLabelText('deposit.mica.agreeAndContinue'));
      });
      return mockSubmitMicaConsent.mock.calls[0][0] as string;
    };

    it('uses a negative UTC offset for timezones behind UTC', async () => {
      timezoneSpy.mockReturnValue(300);

      expect(await submittedTimestamp()).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/,
      );
    });

    it('uses a positive UTC offset with minutes for timezones ahead of UTC', async () => {
      timezoneSpy.mockReturnValue(-330);

      expect(await submittedTimestamp()).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30$/,
      );
    });
  });

  describe('failure logging', () => {
    let loggerError: jest.SpyInstance;
    let openURL: jest.SpyInstance;
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      loggerError = jest.spyOn(Logger, 'error').mockImplementation(() => {
        // swallow logs in tests
      });
      openURL = jest.spyOn(Linking, 'openURL');
      consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      loggerError.mockRestore();
      openURL.mockRestore();
      consoleError.mockRestore();
    });

    it('logs when an external link fails to open', async () => {
      const openError = new Error('no handler');
      openURL.mockRejectedValue(openError);
      const utils = renderScreen();
      await waitFor(() => {
        expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.press(
          utils.getByText('deposit.mica_consent.support_link_text'),
        );
      });

      expect(loggerError).toHaveBeenCalledWith(
        openError,
        'Failed to open Transak support URL',
      );
    });

    it('logs the details failure and still shows the retry banner', async () => {
      const detailsError = new Error('details unavailable');
      mockGetUserDetails.mockRejectedValue(detailsError);
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('deposit.mica.retry_button')).toBeOnTheScreen();
      });

      expect(loggerError).toHaveBeenCalledWith(
        detailsError,
        'MicaConsent: Failed to fetch user details',
      );
    });

    it('logs unexpected errors escaping the initial details load', async () => {
      const detailsError = new Error('details unavailable');
      const loggingError = new Error('logger failed');
      mockGetUserDetails.mockRejectedValue(detailsError);
      loggerError.mockImplementationOnce(() => {
        throw loggingError;
      });

      renderScreen();

      await waitFor(() => {
        expect(loggerError).toHaveBeenCalledWith(
          loggingError,
          'MicaConsent: Unhandled error in effect',
        );
      });
    });

    it('does not touch state when the details request fails after unmount', async () => {
      let rejectDetails: (reason: Error) => void = () => undefined;
      mockGetUserDetails.mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectDetails = reject;
        }),
      );
      const utils = renderScreen();
      utils.unmount();

      await act(async () => {
        rejectDetails(new Error('late failure'));
      });

      expect(loggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'late failure' }),
        'MicaConsent: Failed to fetch user details',
      );
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('does not touch state when the details request resolves after unmount', async () => {
      let resolveDetails: (details: typeof mockUserDetails) => void = () =>
        undefined;
      mockGetUserDetails.mockReturnValue(
        new Promise((resolve) => {
          resolveDetails = resolve;
        }),
      );
      const utils = renderScreen();
      utils.unmount();

      await act(async () => {
        resolveDetails(mockUserDetails);
      });

      expect(loggerError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  it('does not submit when the handler runs before both consents are given', async () => {
    const utils = renderScreen();
    await waitFor(() => {
      expect(utils.getByText(/John Doe/)).toBeOnTheScreen();
    });
    fireEvent.press(utils.getByTestId('mica-consent-data-processing-checkbox'));

    await act(async () => {
      await mockLayoutProps.mock.lastCall?.[0].onSubmit();
    });

    expect(mockSubmitMicaConsent).not.toHaveBeenCalled();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });
});
