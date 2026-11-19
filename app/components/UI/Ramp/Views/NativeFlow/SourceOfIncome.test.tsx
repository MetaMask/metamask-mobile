import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SourceOfIncome from './SourceOfIncome';
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

const mockSubmitSourceOfIncome = jest.fn().mockResolvedValue(undefined);
const mockGetUserDetails = jest.fn().mockResolvedValue({
  address: { countryCode: 'US' },
});
const mockGetAdditionalRequirements = jest.fn().mockResolvedValue({
  formsRequired: [
    {
      type: 'SOURCE_OF_INCOME',
      metadata: mockEEAMetadata,
    },
  ],
});

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    submitSourceOfIncome: mockSubmitSourceOfIncome,
    getUserDetails: mockGetUserDetails,
    getAdditionalRequirements: mockGetAdditionalRequirements,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

const mockEEAMetadata = {
  options: [],
  documentProofOptions: [],
  expiresAt: '',
  kycUrl: '',
  workFlowRunId: '',
  sourceOfFundsTypeOptions: [
    { name: 'Salary payments', value: 'salary_payment' },
    { name: 'Savings', value: 'savings' },
  ],
  employmentStatusOptions: [
    { name: 'Mid-Level Employee', value: 'mid_level_employee' },
    { name: 'Student', value: 'student' },
  ],
  countryOfCitizenshipOptions: [
    { name: 'Germany', value: 'DE' },
    { name: 'France', value: 'FR' },
  ],
};

const mockNonEEAMetadata = {
  options: [],
  documentProofOptions: [],
  expiresAt: '',
  kycUrl: '',
  workFlowRunId: '',
  sourceOfFundsTypeOptions: [
    { name: 'Salary payments', value: 'salary_payment' },
    { name: 'Savings', value: 'savings' },
  ],
};

const mockUseParamsReturn = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
  metadata: mockEEAMetadata,
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
  mockSubmitSourceOfIncome: jest.fn().mockResolvedValue(undefined),
  EEA_COUNTRIES: ['DE', 'FR', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'],
}));

jest.mock('../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({
    userRegion: { country: { isoCode: 'US' } },
  }),
}));

describe('SourceOfIncome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.metadata = mockEEAMetadata;
    mockGetUserDetails.mockResolvedValue({
      address: { countryCode: 'US' },
    });
  });

  it('renders correctly for EEA users with valid metadata', async () => {
    mockGetUserDetails.mockResolvedValue({
      address: { countryCode: 'DE' },
    });

    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.sourceOfIncomeDescription')).toBeTruthy();
      expect(getByText('deposit.mica.monthlyVolumeLabel')).toBeTruthy();
      expect(getByText('deposit.mica.sourceOfFundsLabel')).toBeTruthy();
      expect(getByText('deposit.mica.employmentStatusLabel')).toBeTruthy();
      expect(getByText('deposit.mica.nationalityLabel')).toBeTruthy();
    });
  });

  it('calls getUserDetails on mount', async () => {
    render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalled();
    });
  });

  it('prefers address country code over region for EEA check', async () => {
    mockGetUserDetails.mockResolvedValue({
      address: { countryCode: 'DE' },
    });

    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalled();
      expect(getByText('deposit.mica.employmentStatusLabel')).toBeTruthy();
    });
  });

  it('renders correctly for non-EEA users', async () => {
    mockUseParamsReturn.metadata = {
      ...mockNonEEAMetadata,
      employmentStatusOptions: [],
      countryOfCitizenshipOptions: [],
    };

    const { getByText, queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.sourceOfIncomeDescription')).toBeTruthy();
      expect(getByText('deposit.mica.monthlyVolumeLabel')).toBeTruthy();
      expect(getByText('deposit.mica.sourceOfFundsLabel')).toBeTruthy();
      expect(queryByText('deposit.mica.employmentStatusLabel')).toBeNull();
      expect(queryByText('deposit.mica.nationalityLabel')).toBeNull();
    });
  });

  it('renders submit button', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.submitButton')).toBeTruthy();
    });
  });

  it('uses address country code over region for EEA determination', async () => {
    mockGetUserDetails.mockResolvedValue({
      address: { countryCode: 'DE' },
    });

    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.mica.employmentStatusLabel')).toBeTruthy();
      expect(getByText('deposit.mica.nationalityLabel')).toBeTruthy();
    });
  });
});
