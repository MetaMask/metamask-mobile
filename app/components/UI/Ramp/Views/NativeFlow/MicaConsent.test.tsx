import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    getUserDetails: mockGetUserDetails,
    submitMicaConsent: mockSubmitMicaConsent,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

const mockUseParamsReturn = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
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

jest.mock('../../utils/micaMockMode', () => ({
  isMicaMockModeEnabled: jest.fn(() => false),
  mockSubmitMicaConsent: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }),
}));

describe('MicaConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.continueWithTransak')).toBeTruthy();
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
      expect(getByText('John Doe', { exact: false })).toBeTruthy();
      expect(getByText('1 Jan 1990', { exact: false })).toBeTruthy();
      expect(getByText(/123 Main St/)).toBeTruthy();
      expect(getByText(/10117 Berlin, Germany/)).toBeTruthy();
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
      ).toBeTruthy();
    });

    const button = getByLabelText('deposit.mica.agreeAndContinue');
    expect(button.props.accessibilityState?.disabled).toBe(true);
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
      ).toBeTruthy();
      expect(getByText('deposit.mica_consent.terms_link_text')).toBeTruthy();
      expect(getByText('deposit.mica_consent.privacy_link_text')).toBeTruthy();
    });
  });

  it('renders agree and continue button', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.agreeAndContinue')).toBeTruthy();
    });
  });

  it('renders correctly in mock mode', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <MicaConsent />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.mica_consent.data_processing_consent'),
      ).toBeTruthy();
    });
  });
});
