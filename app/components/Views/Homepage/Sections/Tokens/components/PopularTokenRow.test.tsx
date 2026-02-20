import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import PopularTokenRow from './PopularTokenRow';
import type { PopularToken } from '../hooks/usePopularTokens';

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

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

// Mock AvatarToken to avoid deep selector dependencies
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const { View } = jest.requireActual('react-native');
    return ({
      name,
      testID,
    }: {
      name: string;
      testID?: string;
      imageSource?: { uri: string };
      size?: string;
    }) => <View testID={testID || `avatar-${name}`} />;
  },
);

const createMockToken = (
  overrides: Partial<PopularToken> = {},
): PopularToken => ({
  assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678',
  name: 'Test Token',
  symbol: 'TEST',
  iconUrl: 'https://example.com/icon.png',
  price: 100.5,
  priceChange1d: 5.25,
  ...overrides,
});

describe('PopularTokenRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders token name and symbol', () => {
      const token = createMockToken({ name: 'Ethereum', symbol: 'ETH' });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
    });

    it('renders price with currency formatting', () => {
      const token = createMockToken({ price: 1234.56 });

      renderWithProvider(<PopularTokenRow token={token} />);

      // Price should be formatted with currency symbol
      expect(screen.getByText('$1,234.56')).toBeOnTheScreen();
    });

    it('renders dash when price is undefined', () => {
      const token = createMockToken({ price: undefined });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('—')).toBeOnTheScreen();
    });

    it('renders positive percentage change with plus sign', () => {
      const token = createMockToken({ priceChange1d: 5.25 });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('+5.25%')).toBeOnTheScreen();
    });

    it('renders negative percentage change', () => {
      const token = createMockToken({ priceChange1d: -3.5 });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('-3.50%')).toBeOnTheScreen();
    });

    it('renders zero percentage change with plus sign', () => {
      const token = createMockToken({ priceChange1d: 0 });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('+0.00%')).toBeOnTheScreen();
    });

    it('does not render percentage when undefined', () => {
      const token = createMockToken({ priceChange1d: undefined });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.queryByText('%')).not.toBeOnTheScreen();
    });

    it('renders description instead of price when provided', () => {
      const token = createMockToken({
        description: 'Earn 3% bonus',
        price: 100,
        priceChange1d: 5,
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('Earn 3% bonus')).toBeOnTheScreen();
      // Price should not be rendered when description is present
      expect(screen.queryByText('$100.00')).not.toBeOnTheScreen();
    });

    it('renders Buy button', () => {
      const token = createMockToken();

      renderWithProvider(<PopularTokenRow token={token} />);

      expect(screen.getByText('Buy')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to Asset screen on row press with EVM ERC20 token', () => {
      const token = createMockToken({
        assetId: 'eip155:1/erc20:0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'USD Coin',
        symbol: 'USDC',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('USD Coin'));

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x1',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        symbol: 'USDC',
        isNative: false,
      });
    });

    it('navigates with zero address for native EVM tokens', () => {
      const token = createMockToken({
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('Test Token').parent?.parent as never);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x1',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        isNative: true,
      });
    });

    it('navigates with CAIP format for non-EVM chains', () => {
      const token = createMockToken({
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('Test Token').parent?.parent as never);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        isNative: true,
      });
    });

    it('navigates with empty values for invalid CAIP-19 format', () => {
      const token = createMockToken({
        assetId: 'invalid-asset-id',
        symbol: 'INVALID',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('Test Token').parent?.parent as never);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '',
        address: '',
        symbol: 'INVALID',
        isNative: false,
      });
    });
  });

  describe('buy button', () => {
    it('calls goToBuy with assetId when Buy button is pressed', () => {
      const token = createMockToken({
        assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('Buy'));

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678',
      });
    });
  });

  describe('edge cases', () => {
    it('handles BNB chain correctly (chainId 56 -> 0x38)', () => {
      const token = createMockToken({
        assetId: 'eip155:56/slip44:60',
        symbol: 'BNB',
      });

      renderWithProvider(<PopularTokenRow token={token} />);

      fireEvent.press(screen.getByText('Test Token').parent?.parent as never);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x38',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'BNB',
        isNative: true,
      });
    });

    it('handles Infinity price change gracefully', () => {
      const token = createMockToken({ priceChange1d: Infinity });

      renderWithProvider(<PopularTokenRow token={token} />);

      // Should not render percentage for Infinity
      expect(screen.queryByText('Infinity%')).not.toBeOnTheScreen();
    });

    it('handles NaN price change gracefully', () => {
      const token = createMockToken({ priceChange1d: NaN });

      renderWithProvider(<PopularTokenRow token={token} />);

      // Should not render percentage for NaN
      expect(screen.queryByText('NaN%')).not.toBeOnTheScreen();
    });
  });
});
