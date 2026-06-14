import React from 'react';
import { render, act } from '@testing-library/react-native';
import KycWebview from './KycWebview';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockRouteAfterAuthentication = jest.fn().mockResolvedValue(undefined);

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

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
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

  it('logs error when routeAfterAuthentication fails', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger') as {
      error: jest.Mock;
    };
    mockRouteAfterAuthentication.mockRejectedValueOnce(
      new Error('Route failed'),
    );
    mockIdProofStatus = 'SUBMITTED';

    renderWithTheme(<KycWebview />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message: 'KycWebview::routeAfterAuthentication error',
      }),
    );
  });

  it('retries after routeAfterAuthentication failure when deps change', async () => {
    mockRouteAfterAuthentication
      .mockRejectedValueOnce(new Error('Route failed'))
      .mockResolvedValueOnce(undefined);
    mockIdProofStatus = 'SUBMITTED';

    const { rerender } = renderWithTheme(<KycWebview />);

    // First call fails, ref resets
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRouteAfterAuthentication).toHaveBeenCalledTimes(1);

    // Simulate polling cycle: status changes away then back to SUBMITTED
    mockIdProofStatus = 'NOT_SUBMITTED';
    await act(async () => {
      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <KycWebview />
        </ThemeContext.Provider>,
      );
    });

    mockIdProofStatus = 'SUBMITTED';
    await act(async () => {
      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <KycWebview />
        </ThemeContext.Provider>,
      );
    });

    expect(mockRouteAfterAuthentication).toHaveBeenCalledTimes(2);
  });

  it('passes workFlowRunId to useTransakIdProofPolling', () => {
    const mockHook = jest.requireMock(
      '../../hooks/useTransakIdProofPolling',
    ) as { default: jest.Mock };

    renderWithTheme(<KycWebview />);

    expect(mockHook.default).toHaveBeenCalledWith('wf-test-456', 2000, true, 0);
  });
});
