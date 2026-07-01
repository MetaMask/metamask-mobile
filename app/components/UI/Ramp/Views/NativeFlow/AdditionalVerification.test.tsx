import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import V2AdditionalVerification from './AdditionalVerification';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

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

const mockNavigateToKycWebview = jest.fn();
const mockUseTransakRouting = jest.fn((_config: unknown) => ({
  navigateToKycWebview: mockNavigateToKycWebview,
}));

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: (config: unknown) => mockUseTransakRouting(config),
}));

let mockParams = {
  quote: { quoteId: 'test-quote-id', fiatAmount: 127.37 },
  kycUrl: 'https://kyc.example.com',
  workFlowRunId: 'wf-123',
  amount: 25,
  headlessSessionId: undefined as string | undefined,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => mockParams,
}));

jest.mock('../../assets/additional-verification.png', () => 'mock-image');

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2AdditionalVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      quote: { quoteId: 'test-quote-id', fiatAmount: 127.37 },
      kycUrl: 'https://kyc.example.com',
      workFlowRunId: 'wf-123',
      amount: 25,
      headlessSessionId: undefined,
    };
  });

  it('calls navigateToKycWebview when continue button is pressed', () => {
    const { getByText } = renderWithTheme(<V2AdditionalVerification />);

    fireEvent.press(getByText('deposit.additional_verification.button'));

    expect(mockNavigateToKycWebview).toHaveBeenCalledWith({
      quote: { quoteId: 'test-quote-id', fiatAmount: 127.37 },
      kycUrl: 'https://kyc.example.com',
      workFlowRunId: 'wf-123',
      amount: 25,
    });
  });

  it('configures Transak routing with the headless host when a headless session is present', () => {
    mockParams = {
      ...mockParams,
      headlessSessionId: 'headless-buy-abc',
    };

    renderWithTheme(<V2AdditionalVerification />);

    expect(mockUseTransakRouting).toHaveBeenCalledWith({
      baseRoute: 'RampHeadlessHost',
      baseRouteParams: { headlessSessionId: 'headless-buy-abc' },
      screenLocation: 'V2 AdditionalVerification Screen',
    });
  });

  it('uses regular Transak routing when no headless session is present', () => {
    renderWithTheme(<V2AdditionalVerification />);

    expect(mockUseTransakRouting).toHaveBeenCalledWith({
      screenLocation: 'V2 AdditionalVerification Screen',
    });
  });

  it('calls navigation.goBack when header back is pressed', () => {
    const { getByTestId } = renderWithTheme(<V2AdditionalVerification />);

    fireEvent.press(getByTestId('deposit-back-navbar-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the title and paragraphs', () => {
    const { getByText, getAllByText } = renderWithTheme(
      <V2AdditionalVerification />,
    );

    expect(getAllByText('deposit.additional_verification.title')).toHaveLength(
      2,
    );
    expect(
      getByText('deposit.additional_verification.paragraph_1'),
    ).toBeOnTheScreen();
    expect(
      getByText('deposit.additional_verification.paragraph_2'),
    ).toBeOnTheScreen();
  });
});
