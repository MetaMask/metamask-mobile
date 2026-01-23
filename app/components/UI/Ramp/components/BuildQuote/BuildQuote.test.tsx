import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { RampsToken } from '../../hooks/useRampTokens';
import type { CaipChainId } from '@metamask/utils';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

const MOCK_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MOCK_CHAIN_ID = 'eip155:1' as CaipChainId;

const createMockToken = (overrides?: Partial<RampsToken>): RampsToken => ({
  assetId: MOCK_ASSET_ID,
  chainId: MOCK_CHAIN_ID,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl: 'https://example.com/usdc.png',
  tokenSupported: true,
  decimals: 6,
  ...overrides,
});

const mockTokenNetworkInfo = {
  networkName: 'Ethereum Mainnet',
  networkImageSource: { uri: 'https://example.com/eth.png' },
};

const mockGetTokenNetworkInfo = jest.fn(() => mockTokenNetworkInfo);
const mockGetRampsBuildQuoteNavbarOptions = jest.fn(
  (_navigation: unknown, _options: unknown) => ({}),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      assetId: MOCK_ASSET_ID,
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../Navbar', () => ({
  getRampsBuildQuoteNavbarOptions: (navigation: unknown, options: unknown) =>
    mockGetRampsBuildQuoteNavbarOptions(navigation, options),
}));

jest.mock('../../utils/formatCurrency', () => ({
  formatCurrency: (amount: number) => `$${amount}`,
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => mockGetTokenNetworkInfo,
}));

jest.mock('../PaymentSelectionModal', () => ({
  createPaymentSelectionModalNavigationDetails: () => [
    'RampModals',
    'RampPaymentSelectionModal',
  ],
}));

interface MockUserRegion {
  country: {
    currency: string;
    quickAmounts: number[];
  };
  state: null;
  regionCode: string;
}

const defaultUserRegion: MockUserRegion = {
  country: {
    currency: 'USD',
    quickAmounts: [50, 100, 200, 400],
  },
  state: null,
  regionCode: 'us',
};

let mockUserRegion: MockUserRegion | null = defaultUserRegion;
let mockPreferredProvider: unknown = null;
let mockTokens: {
  allTokens: ReturnType<typeof createMockToken>[];
  topTokens: ReturnType<typeof createMockToken>[];
} | null = {
  allTokens: [createMockToken()],
  topTokens: [createMockToken()],
};

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    userRegion: mockUserRegion,
    preferredProvider: mockPreferredProvider,
    tokens: mockTokens,
  }),
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('BuildQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRegion = defaultUserRegion;
    mockPreferredProvider = null;
    mockTokens = {
      allTokens: [createMockToken()],
      topTokens: [createMockToken()],
    };
    mockGetTokenNetworkInfo.mockReturnValue(mockTokenNetworkInfo);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays initial amount as $0', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('$0')).toBeOnTheScreen();
  });

  it('renders the keypad', () => {
    const { getByText, getByTestId } = renderWithTheme(<BuildQuote />);

    // Check keypad digits are rendered
    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('2')).toBeOnTheScreen();
    expect(getByText('3')).toBeOnTheScreen();
    expect(getByText('4')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(getByText('6')).toBeOnTheScreen();
    expect(getByText('7')).toBeOnTheScreen();
    expect(getByText('8')).toBeOnTheScreen();
    expect(getByText('9')).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
    expect(getByTestId('keypad-delete-button')).toBeOnTheScreen();
  });

  it('updates amount when keypad digit is pressed', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('5'));

    expect(getByText('$5')).toBeOnTheScreen();
  });

  it('updates amount with multiple digit presses', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));

    expect(getByText('$123')).toBeOnTheScreen();
  });

  it('deletes last digit when delete button is pressed', () => {
    const { getByText, getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(getByText('$1')).toBeOnTheScreen();
  });

  it('sets navigation options with token and network data', () => {
    renderWithTheme(<BuildQuote />);

    expect(mockGetRampsBuildQuoteNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        goBack: mockGoBack,
      }),
      expect.objectContaining({
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        tokenIconUrl: 'https://example.com/usdc.png',
        networkName: 'Ethereum Mainnet',
        networkImageSource: { uri: 'https://example.com/eth.png' },
        onSettingsPress: expect.any(Function),
      }),
    );
  });

  it('renders the payment method pill', () => {
    const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

    expect(getByTestId('payment-method-pill')).toBeOnTheScreen();
    expect(getByText('fiat_on_ramp.debit_card')).toBeOnTheScreen();
  });

  it('navigates to PaymentSelectionModal when payment method pill is pressed', () => {
    const { getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('payment-method-pill'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'RampModals',
      'RampPaymentSelectionModal',
    );
  });

  it('sets navigation options with undefined values when token is not found (shows skeleton)', () => {
    mockTokens = {
      allTokens: [],
      topTokens: [],
    };

    renderWithTheme(<BuildQuote />);

    expect(mockGetRampsBuildQuoteNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        goBack: mockGoBack,
      }),
      expect.objectContaining({
        tokenName: undefined,
        tokenSymbol: undefined,
        tokenIconUrl: undefined,
        networkName: undefined,
        networkImageSource: undefined,
        onSettingsPress: expect.any(Function),
      }),
    );
  });

  it('renders quick amount buttons', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('$50')).toBeOnTheScreen();
    expect(getByText('$100')).toBeOnTheScreen();
    expect(getByText('$200')).toBeOnTheScreen();
    expect(getByText('$400')).toBeOnTheScreen();
  });

  it('does not render quick amount buttons when no quick amounts are available', () => {
    mockUserRegion = {
      country: {
        currency: 'USD',
        quickAmounts: [],
      },
      state: null,
      regionCode: 'us',
    };

    const { queryByTestId } = renderWithTheme(<BuildQuote />);

    expect(queryByTestId('quick-amounts')).toBeNull();
  });

  it('updates amount when quick amount button is pressed', () => {
    const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('quick-amounts-button-100'));

    // After pressing $100, the amount display shows $100
    expect(getByText('$100')).toBeOnTheScreen();
  });

  it('hides quick amounts and shows continue button when amount is entered', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithTheme(
      <BuildQuote />,
    );

    // Initially, quick amounts are visible
    expect(getByTestId('quick-amounts')).toBeOnTheScreen();
    expect(queryByTestId('build-quote-continue-button')).toBeNull();

    // Enter an amount
    fireEvent.press(getByText('5'));

    // Quick amounts should be hidden, continue button should appear
    expect(queryByTestId('quick-amounts')).toBeNull();
    expect(getByTestId('build-quote-continue-button')).toBeOnTheScreen();
  });

  it('displays powered by provider text when preferred provider is set', () => {
    mockPreferredProvider = {
      id: '/providers/transak',
      name: 'Transak',
      environmentType: 'PRODUCTION',
      description: 'Test Provider',
      hqAddress: '123 Test St',
      links: [],
      logos: { light: '', dark: '', height: 24, width: 79 },
    };

    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('fiat_on_ramp.powered_by_provider')).toBeOnTheScreen();
  });

  it('does not display powered by text when no preferred provider is set', () => {
    mockPreferredProvider = null;

    const { queryByText } = renderWithTheme(<BuildQuote />);

    expect(queryByText('fiat_on_ramp.powered_by_provider')).toBeNull();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<BuildQuote />);

    expect(toJSON()).toMatchSnapshot();
  });
});
