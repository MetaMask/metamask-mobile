import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AmountInput from './AmountInput';
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
const mockUseRampTokens = jest.fn(() => ({
  allTokens: [createMockToken()],
  topTokens: [createMockToken()],
  isLoading: false,
  error: null,
}));
const mockGetRampsAmountInputNavbarOptions = jest.fn(
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
  getRampsAmountInputNavbarOptions: (navigation: unknown, options: unknown) =>
    mockGetRampsAmountInputNavbarOptions(navigation, options),
}));

jest.mock('../../Deposit/utils', () => ({
  formatCurrency: (amount: number) => `$${amount}`,
}));

jest.mock('../../hooks/useRampTokens', () => ({
  useRampTokens: () => mockUseRampTokens(),
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => mockGetTokenNetworkInfo,
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('AmountInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampTokens.mockReturnValue({
      allTokens: [createMockToken()],
      topTokens: [createMockToken()],
      isLoading: false,
      error: null,
    });
    mockGetTokenNetworkInfo.mockReturnValue(mockTokenNetworkInfo);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays initial amount as $0', () => {
    const { getByText } = renderWithTheme(<AmountInput />);

    expect(getByText('$0')).toBeOnTheScreen();
  });

  it('renders the keypad', () => {
    const { getByText, getByTestId } = renderWithTheme(<AmountInput />);

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
    const { getByText } = renderWithTheme(<AmountInput />);

    fireEvent.press(getByText('5'));

    expect(getByText('$5')).toBeOnTheScreen();
  });

  it('updates amount with multiple digit presses', () => {
    const { getByText } = renderWithTheme(<AmountInput />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));

    expect(getByText('$123')).toBeOnTheScreen();
  });

  it('deletes last digit when delete button is pressed', () => {
    const { getByText, getByTestId } = renderWithTheme(<AmountInput />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(getByText('$1')).toBeOnTheScreen();
  });

  it('sets navigation options with token and network data', () => {
    renderWithTheme(<AmountInput />);

    expect(mockGetRampsAmountInputNavbarOptions).toHaveBeenCalledWith(
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
    const { getByTestId, getByText } = renderWithTheme(<AmountInput />);

    expect(getByTestId('payment-method-pill')).toBeOnTheScreen();
    expect(getByText('fiat_on_ramp.debit_card')).toBeOnTheScreen();
  });

  it('sets navigation options with undefined values when token is not found (shows skeleton)', () => {
    mockUseRampTokens.mockReturnValue({
      allTokens: [],
      topTokens: [],
      isLoading: false,
      error: null,
    });

    renderWithTheme(<AmountInput />);

    expect(mockGetRampsAmountInputNavbarOptions).toHaveBeenCalledWith(
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
    const { getByText } = renderWithTheme(<AmountInput />);

    expect(getByText('$50')).toBeOnTheScreen();
    expect(getByText('$100')).toBeOnTheScreen();
    expect(getByText('$200')).toBeOnTheScreen();
    expect(getByText('$400')).toBeOnTheScreen();
  });

  it('updates amount when quick amount button is pressed', () => {
    const { getByTestId, getAllByText } = renderWithTheme(<AmountInput />);

    fireEvent.press(getByTestId('quick-amounts-button-100'));

    // After pressing $100, there should be two "$100" texts:
    // one in the button and one in the main amount display
    const amountTexts = getAllByText('$100');
    expect(amountTexts.length).toBe(2);
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<AmountInput />);

    expect(toJSON()).toMatchSnapshot();
  });
});
