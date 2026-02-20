import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokensSection from './TokensSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock useRampNavigation to avoid deep import chain
jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

const mockUseIsZeroBalanceAccount = jest.fn();
const mockUsePopularTokens = jest.fn();

jest.mock('./hooks', () => ({
  useIsZeroBalanceAccount: () => mockUseIsZeroBalanceAccount(),
  usePopularTokens: () => mockUsePopularTokens(),
}));

const mockSortedTokenKeys = jest.fn();

jest.mock('../../../../../selectors/assets/assets-list', () => ({
  selectSortedAssetsBySelectedAccountGroup: (state: unknown) =>
    mockSortedTokenKeys(state),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: () => false,
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
}));

// Mock TokenListItem to avoid complex import chains
jest.mock('../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    TokenListItem: ({ assetKey }: { assetKey: { address: string } }) =>
      ReactActual.createElement(
        Text,
        { testID: `token-item-${assetKey.address}` },
        `Token ${assetKey.address}`,
      ),
  };
});

// Mock PopularTokenRow to avoid deep import chains (AvatarToken uses selectors)
jest.mock('./components/PopularTokenRow', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      token,
    }: {
      token: {
        assetId: string;
        name: string;
        price?: number;
        priceChange1d?: number;
      };
    }) =>
      ReactActual.createElement(
        View,
        { testID: `popular-token-row-${token.assetId}` },
        ReactActual.createElement(Text, null, token.name),
        token.price !== undefined &&
          ReactActual.createElement(
            Text,
            { testID: `price-${token.assetId}` },
            `$${token.price.toFixed(2)}`,
          ),
        token.priceChange1d !== undefined &&
          ReactActual.createElement(
            Text,
            { testID: `change-${token.assetId}` },
            `${token.priceChange1d >= 0 ? '+' : ''}${token.priceChange1d.toFixed(2)}%`,
          ),
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: `buy-button-${token.assetId}`,
            onPress: () =>
              jest
                .requireMock('../../../../UI/Ramp/hooks/useRampNavigation')
                .useRampNavigation()
                .goToBuy({ assetId: token.assetId }),
          },
          ReactActual.createElement(Text, null, 'Buy'),
        ),
      ),
  };
});

const mockPopularTokens = [
  {
    assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    name: 'MetaMask USD',
    symbol: 'mUSD',
    iconUrl: 'https://example.com/musd.png',
    price: 1.0,
    priceChange1d: 0.01,
  },
  {
    assetId: 'eip155:1/slip44:60',
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'https://example.com/eth.png',
    price: 3000.0,
    priceChange1d: 2.5,
  },
];

describe('TokensSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    mockUsePopularTokens.mockReturnValue({
      tokens: mockPopularTokens,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders section title for account with balance', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    renderWithProvider(<TokensSection />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('renders "Tokens" title for zero balance account', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(<TokensSection />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('renders popular tokens for zero balance account', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(<TokensSection />);

    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('Ethereum')).toBeOnTheScreen();
  });

  it('renders Buy button for popular tokens in zero balance state', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(<TokensSection />);

    expect(screen.getAllByText('Buy')).toHaveLength(2);
  });

  it('calls goToBuy with assetId when Buy button is pressed', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(<TokensSection />);

    const buyButtons = screen.getAllByText('Buy');
    fireEvent.press(buyButtons[0]);

    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    });
  });

  it('renders token list items for account with tokens', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
      { chainId: '0x1', address: '0xtoken2', isStaked: false },
    ]);

    renderWithProvider(<TokensSection />);

    expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    expect(screen.getByTestId('token-item-0xtoken2')).toBeOnTheScreen();
  });

  it('limits displayed tokens to MAX_TOKENS_DISPLAYED (5)', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
      { chainId: '0x1', address: '0xtoken2', isStaked: false },
      { chainId: '0x1', address: '0xtoken3', isStaked: false },
      { chainId: '0x1', address: '0xtoken4', isStaked: false },
      { chainId: '0x1', address: '0xtoken5', isStaked: false },
      { chainId: '0x1', address: '0xtoken6', isStaked: false },
      { chainId: '0x1', address: '0xtoken7', isStaked: false },
    ]);

    renderWithProvider(<TokensSection />);

    expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    expect(screen.getByTestId('token-item-0xtoken5')).toBeOnTheScreen();
    expect(screen.queryByTestId('token-item-0xtoken6')).toBeNull();
    expect(screen.queryByTestId('token-item-0xtoken7')).toBeNull();
  });

  it('navigates to tokens full view on title press', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    renderWithProvider(<TokensSection />);

    fireEvent.press(screen.getByLabelText('Tokens'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.TOKENS_FULL_VIEW);
  });
});
