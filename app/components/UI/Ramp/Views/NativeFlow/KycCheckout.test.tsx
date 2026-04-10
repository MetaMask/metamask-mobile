import React from 'react';
import { render, act } from '@testing-library/react-native';
import KycCheckout from './KycCheckout';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: jest.fn(),
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    url: 'https://kyc.example.com',
    providerName: 'Transak',
    workFlowRunId: 'wf-test-456',
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

describe('KycCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdProofStatus = null;
  });

  it('renders Checkout component', () => {
    const { getByTestId } = renderWithTheme(<KycCheckout />);
    expect(getByTestId('checkout-mock')).toBeOnTheScreen();
  });

  it('calls goBack when idProofStatus is SUBMITTED', () => {
    mockIdProofStatus = 'SUBMITTED';

    renderWithTheme(<KycCheckout />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack when status is not SUBMITTED', () => {
    mockIdProofStatus = 'NOT_SUBMITTED';

    renderWithTheme(<KycCheckout />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not call goBack when status is null', () => {
    mockIdProofStatus = null;

    renderWithTheme(<KycCheckout />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not call goBack twice on re-render with SUBMITTED', () => {
    mockIdProofStatus = 'SUBMITTED';

    const { rerender } = renderWithTheme(<KycCheckout />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    // Re-render — hasNavigatedRef should prevent second goBack
    act(() => {
      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <KycCheckout />
        </ThemeContext.Provider>,
      );
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('passes workFlowRunId to useTransakIdProofPolling', () => {
    const mockHook = jest.requireMock(
      '../../hooks/useTransakIdProofPolling',
    ) as { default: jest.Mock };

    renderWithTheme(<KycCheckout />);

    expect(mockHook.default).toHaveBeenCalledWith('wf-test-456', 2000, true, 0);
  });
});
