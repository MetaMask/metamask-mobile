import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import V2AdditionalVerification from './AdditionalVerification';
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

const mockNavigateToKycWebview = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    navigateToKycWebview: mockNavigateToKycWebview,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
    kycUrl: 'https://kyc.example.com',
    workFlowRunId: 'wf-123',
  }),
}));

jest.mock(
  '../../Deposit/assets/additional-verification.png',
  () => 'mock-image',
);

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2AdditionalVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2AdditionalVerification />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls navigateToKycWebview when continue button is pressed', () => {
    const { getByText } = renderWithTheme(<V2AdditionalVerification />);

    fireEvent.press(getByText('deposit.additional_verification.button'));

    expect(mockNavigateToKycWebview).toHaveBeenCalledWith({
      quote: { quoteId: 'test-quote-id', fiatAmount: 100 },
      kycUrl: 'https://kyc.example.com',
      workFlowRunId: 'wf-123',
    });
  });

  it('renders the title and paragraphs', () => {
    const { getByText } = renderWithTheme(<V2AdditionalVerification />);

    expect(
      getByText('deposit.additional_verification.title'),
    ).toBeOnTheScreen();
    expect(
      getByText('deposit.additional_verification.paragraph_1'),
    ).toBeOnTheScreen();
    expect(
      getByText('deposit.additional_verification.paragraph_2'),
    ).toBeOnTheScreen();
  });
});
