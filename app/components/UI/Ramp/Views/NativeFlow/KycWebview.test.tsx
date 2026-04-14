import React from 'react';
import { render, act } from '@testing-library/react-native';
import KycWebview from './KycWebview';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockRouteAfterAuthentication = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

const mockQuote = { id: 'quote-123' };

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    url: 'https://kyc.example.com',
    providerName: 'Transak',
    workFlowRunId: 'wf-test-456',
    quote: mockQuote,
    amount: 100,
  }),
}));

let mockIdProofStatus: 'SUBMITTED' | 'NOT_SUBMITTED' | null = null;
const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();

jest.mock('../../hooks/useTransakIdProofPolling', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    idProofStatus: mockIdProofStatus,
    loading: false,
    error: null,
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling,
  })),
}));

// Mock Checkout to render a simple placeholder
jest.mock('../Checkout', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="checkout-mock">
        <Text>Checkout Mock</Text>
      </View>
    ),
  };
});

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('KycWebview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdProofStatus = null;
  });

  it('renders Checkout component', () => {
    const { getByTestId } = renderWithTheme(<KycWebview />);
    expect(getByTestId('checkout-mock')).toBeOnTheScreen();
  });

  it('calls routeAfterAuthentication when idProofStatus is SUBMITTED', () => {
    mockIdProofStatus = 'SUBMITTED';

    renderWithTheme(<KycWebview />);

    expect(mockRouteAfterAuthentication).toHaveBeenCalledTimes(1);
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote, 100);
  });

  it('does not call routeAfterAuthentication when status is not SUBMITTED', () => {
    mockIdProofStatus = 'NOT_SUBMITTED';

    renderWithTheme(<KycWebview />);

    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('does not call routeAfterAuthentication when status is null', () => {
    mockIdProofStatus = null;

    renderWithTheme(<KycWebview />);

    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('does not call routeAfterAuthentication twice on re-render with SUBMITTED', () => {
    mockIdProofStatus = 'SUBMITTED';

    const { rerender } = renderWithTheme(<KycWebview />);

    expect(mockRouteAfterAuthentication).toHaveBeenCalledTimes(1);

    // Re-render — hasNavigatedRef should prevent second call
    act(() => {
      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <KycWebview />
        </ThemeContext.Provider>,
      );
    });

    expect(mockRouteAfterAuthentication).toHaveBeenCalledTimes(1);
  });

  it('passes workFlowRunId to useTransakIdProofPolling', () => {
    const mockHook = jest.requireMock(
      '../../hooks/useTransakIdProofPolling',
    ) as { default: jest.Mock };

    renderWithTheme(<KycWebview />);

    expect(mockHook.default).toHaveBeenCalledWith('wf-test-456', 2000, true, 0);
  });
});
