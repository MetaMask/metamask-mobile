import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import V2KycProcessing from './KycProcessing';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
  }),
}));

const mockGetAdditionalRequirements = jest.fn();
const mockGetUserDetails = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    getAdditionalRequirements: mockGetAdditionalRequirements,
    getUserDetails: mockGetUserDetails,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../Deposit/constants', () => ({
  KycStatus: {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2KycProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'SUBMITTED', type: 'SIMPLE' },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('matches snapshot in loading state', () => {
    const { toJSON } = renderWithTheme(<V2KycProcessing />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders activity indicator while polling', async () => {
    const { getByTestId } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('renders error state when kycForms fetch fails', async () => {
    mockGetAdditionalRequirements.mockRejectedValue(new Error('Fetch failed'));

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText('Fetch failed')).toBeOnTheScreen();
    });
  });

  it('renders error state when there are pending forms', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [{ type: 'IDPROOF' }],
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.error_heading'),
      ).toBeOnTheScreen();
    });
  });
});
