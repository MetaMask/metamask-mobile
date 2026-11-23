import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (_amount: number, currency: string) =>
      currency === 'EUR' ? '€0.00' : `${currency}0.00`,
  }),
}));

const mockMetadata = {
  options: [] as { name: string; value: string }[],
  documentProofOptions: [],
  expiresAt: '',
  kycUrl: '',
  workFlowRunId: '',
  sourceOfFundsTypeOptions: [
    { name: 'Salary payments', value: 'salary_payment' },
    { name: 'Savings', value: 'savings' },
  ],
};

const mockSubmitSourceOfIncome = jest.fn().mockResolvedValue({
  status: 'SUBMITTED',
});

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    submitSourceOfIncome: mockSubmitSourceOfIncome,
    getKycRequirement: jest.fn(),
    getAdditionalRequirements: jest.fn(),
  }),
}));

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

const mockUseParamsReturn = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 100, fiatCurrency: 'EUR' },
  quoteId: 'test-quote-id',
  metadata: mockMetadata,
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
  mockSubmitSourceOfIncome: jest.fn().mockResolvedValue({
    status: 'SUBMITTED',
  }),
}));

describe('SourceOfIncome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsReturn.metadata = mockMetadata;
  });

  it('renders the title and subtitle copy', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('deposit.source_of_income.title')).toBeTruthy();
      expect(getByText('deposit.source_of_income.subtitle')).toBeTruthy();
    });
  });

  it('renders monthly volume and source of funds only', async () => {
    const { getByText, queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.source_of_income.monthly_volume_label'),
      ).toBeTruthy();
      expect(
        getByText('deposit.source_of_income.source_of_funds_label'),
      ).toBeTruthy();
      expect(
        queryByText('deposit.source_of_income.employment_status_label'),
      ).toBeNull();
      expect(
        queryByText('deposit.source_of_income.nationality_label'),
      ).toBeNull();
    });
  });

  it('shows the fiat currency symbol inside the monthly volume field', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(getByText('€')).toBeTruthy();
    });
  });

  it('uses the estimate hint as the monthly volume placeholder', async () => {
    const { getByPlaceholderText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByPlaceholderText(
          'deposit.source_of_income.monthly_volume_placeholder',
        ),
      ).toBeTruthy();
    });
  });

  it('opens the option selector sheet from the source of funds picker', async () => {
    mockUseParamsReturn.metadata = {
      ...mockMetadata,
      options: mockMetadata.sourceOfFundsTypeOptions,
    };
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByTestId('source-of-income-source-of-funds-select'),
      ).toBeTruthy();
    });
    fireEvent.press(getByTestId('source-of-income-source-of-funds-select'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'MockRoute',
      expect.objectContaining({
        title: 'deposit.source_of_income.source_of_funds_label',
        options: mockMetadata.sourceOfFundsTypeOptions,
      }),
    );
  });

  it('renders the continue button', async () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SourceOfIncome />
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(
        getByText('deposit.source_of_income.continue_button'),
      ).toBeTruthy();
    });
  });
});
