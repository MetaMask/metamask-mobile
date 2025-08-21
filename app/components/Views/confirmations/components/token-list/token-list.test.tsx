import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImageSourcePropType } from 'react-native';

// eslint-disable-next-line import/no-namespace
import * as AssetSelectionMetrics from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { TokenList } from './token-list';
import { AssetType } from '../../types/token';
import Routes from '../../../../../constants/navigation/Routes';

const mockGotToSendScreen = jest.fn();
const mockUpdateAsset = jest.fn();

jest.mock('../../hooks/send/useSendScreenNavigation', () => ({
  useSendScreenNavigation: () => ({
    gotToSendScreen: mockGotToSendScreen,
  }),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: () => ({
    updateAsset: mockUpdateAsset,
  }),
}));

jest.mock('../UI/token/token', () => {
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    Token: ({
      asset,
      onPress,
    }: {
      asset: AssetType;
      onPress: (asset: AssetType) => void;
    }) => (
      <Pressable
        testID={`token-${asset.symbol}`}
        onPress={() => onPress(asset)}
      >
        <Text>{asset.symbol}</Text>
      </Pressable>
    ),
  };
});

const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    aggregators: [],
    balance: '1.5',
    balanceFiat: '$3000.00',
    chainId: '0x1',
    decimals: 18,
    image: 'https://example.com/eth.png',
    isETH: true,
    isNative: true,
    logo: 'https://example.com/eth.png',
    name: 'Ethereum',
    symbol: 'ETH',
    ticker: 'ETH',
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    aggregators: [],
    balance: '1000.0',
    balanceFiat: '$1000.00',
    chainId: '0x1',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    isETH: false,
    isNative: false,
    logo: 'https://example.com/usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
  },
];

const manyTokens: AssetType[] = Array.from({ length: 25 }, (_, i) => ({
  address: `0x${i.toString().padStart(40, '0')}`,
  aggregators: [],
  balance: '1.0',
  balanceFiat: '$1.00',
  chainId: '0x1',
  decimals: 18,
  image: `https://example.com/token${i}.png`,
  isETH: false,
  isNative: false,
  logo: `https://example.com/token${i}.png`,
  name: `Token ${i}`,
  symbol: `TKN${i}`,
  ticker: `TKN${i}`,
}));

describe('TokenList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with tokens', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    expect(getByTestId('token-ETH')).toBeOnTheScreen();
    expect(getByTestId('token-USDC')).toBeOnTheScreen();
  });

  it('calls updateAsset and gotToSendScreen when token is pressed', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    fireEvent.press(getByTestId('token-ETH'));

    expect(mockUpdateAsset).toHaveBeenCalledWith({
      ...mockTokens[0],
    });

    expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.AMOUNT);
  });

  it('calls required metrics function when token is pressed', () => {
    const mockCaptureAssetSelected = jest.fn();
    jest
      .spyOn(AssetSelectionMetrics, 'useAssetSelectionMetrics')
      .mockReturnValue({
        captureAssetSelected: mockCaptureAssetSelected,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    fireEvent.press(getByTestId('token-ETH'));

    expect(mockCaptureAssetSelected).toHaveBeenCalledWith(mockTokens[0], '0');
  });

  it('calls updateAsset and gotToSendScreen when second token is pressed', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    fireEvent.press(getByTestId('token-USDC'));

    expect(mockUpdateAsset).toHaveBeenCalledWith({
      ...mockTokens[1],
    });

    expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.AMOUNT);
  });

  it('renders empty list when no tokens provided', () => {
    const { queryByTestId } = render(<TokenList tokens={[]} />);

    expect(queryByTestId('token-ETH')).toBeNull();
    expect(queryByTestId('token-USDC')).toBeNull();
  });

  it('renders with single token', () => {
    const singleToken = [mockTokens[0]];
    const { getByTestId } = render(<TokenList tokens={singleToken} />);

    expect(getByTestId('token-ETH')).toBeOnTheScreen();
  });

  it('handles token press with complete asset data', () => {
    const completeToken: AssetType = {
      ...mockTokens[0],
      networkBadgeSource:
        'https://example.com/badge.png' as ImageSourcePropType,
      tokenId: '123',
    };

    const { getByTestId } = render(<TokenList tokens={[completeToken]} />);

    fireEvent.press(getByTestId('token-ETH'));

    expect(mockUpdateAsset).toHaveBeenCalledWith(completeToken);
  });

  it('maintains callback references between renders', () => {
    const { rerender } = render(<TokenList tokens={mockTokens} />);

    rerender(<TokenList tokens={mockTokens} />);

    const { getByTestId } = render(<TokenList tokens={mockTokens} />);
    fireEvent.press(getByTestId('token-ETH'));

    expect(mockUpdateAsset).toHaveBeenCalled();
    expect(mockGotToSendScreen).toHaveBeenCalled();
  });

  it('calls captureAssetSelected with correct position for second token', () => {
    const mockCaptureAssetSelected = jest.fn();
    jest
      .spyOn(AssetSelectionMetrics, 'useAssetSelectionMetrics')
      .mockReturnValue({
        captureAssetSelected: mockCaptureAssetSelected,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    fireEvent.press(getByTestId('token-USDC'));

    expect(mockCaptureAssetSelected).toHaveBeenCalledWith(mockTokens[1], '1');
  });

  describe('pagination functionality', () => {
    it('shows only first 20 tokens initially', () => {
      const { queryByTestId } = render(<TokenList tokens={manyTokens} />);

      expect(queryByTestId('token-TKN0')).toBeOnTheScreen();
      expect(queryByTestId('token-TKN19')).toBeOnTheScreen();

      expect(queryByTestId('token-TKN20')).toBeNull();
      expect(queryByTestId('token-TKN24')).toBeNull();
    });

    it('shows "Show more tokens" button when there are more than 20 tokens', () => {
      const { getByText } = render(<TokenList tokens={manyTokens} />);

      expect(getByText('Show more tokens')).toBeOnTheScreen();
    });

    it('does not show "Show more tokens" button when 20 or fewer tokens', () => {
      const { queryByText } = render(<TokenList tokens={mockTokens} />);

      expect(queryByText('Show more tokens')).toBeNull();
    });

    it('shows more tokens when "Show more tokens" is pressed', () => {
      const { getByText, queryByTestId } = render(
        <TokenList tokens={manyTokens} />,
      );

      expect(queryByTestId('token-TKN20')).toBeNull();

      fireEvent.press(getByText('Show more tokens'));

      expect(queryByTestId('token-TKN20')).toBeOnTheScreen();
      expect(queryByTestId('token-TKN24')).toBeOnTheScreen();
    });

    it('hides "Show more tokens" button when all tokens are visible', () => {
      const { getByText, queryByText } = render(
        <TokenList tokens={manyTokens} />,
      );

      fireEvent.press(getByText('Show more tokens'));

      expect(queryByText('Show more tokens')).toBeNull();
    });
  });

  describe('empty state with active filters', () => {
    const mockOnClearFilters = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows filtered empty state when no tokens and filters are active', () => {
      const { getByText } = render(
        <TokenList
          tokens={[]}
          hasActiveFilters
          onClearFilters={mockOnClearFilters}
        />,
      );

      expect(getByText('No tokens match your filters')).toBeOnTheScreen();
      expect(getByText('Clear filters')).toBeOnTheScreen();
    });

    it('calls onClearFilters when clear filters button is pressed', () => {
      const { getByText } = render(
        <TokenList
          tokens={[]}
          hasActiveFilters
          onClearFilters={mockOnClearFilters}
        />,
      );

      fireEvent.press(getByText('Clear filters'));

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('does not show filtered empty state when filters are not active', () => {
      const { queryByText } = render(
        <TokenList
          tokens={[]}
          hasActiveFilters={false}
          onClearFilters={mockOnClearFilters}
        />,
      );

      expect(queryByText('No tokens match your filters')).toBeNull();
      expect(queryByText('Clear filters')).toBeNull();
    });

    it('does not show filtered empty state when onClearFilters is not provided', () => {
      const { queryByText } = render(
        <TokenList tokens={[]} hasActiveFilters />,
      );

      expect(queryByText('No tokens match your filters')).toBeNull();
      expect(queryByText('Clear filters')).toBeNull();
    });
  });

  describe('empty state without filters', () => {
    it('shows general empty state when no tokens and no active filters', () => {
      const { getByText } = render(<TokenList tokens={[]} />);

      expect(getByText('No tokens available')).toBeOnTheScreen();
    });

    it('shows general empty state when no tokens and hasActiveFilters is false', () => {
      const { getByText } = render(
        <TokenList tokens={[]} hasActiveFilters={false} />,
      );

      expect(getByText('No tokens available')).toBeOnTheScreen();
    });
  });

  describe('state precedence', () => {
    it('shows filtered empty state instead of general empty state when filters are active', () => {
      const mockOnClearFilters = jest.fn();
      const { getByText, queryByText } = render(
        <TokenList
          tokens={[]}
          hasActiveFilters
          onClearFilters={mockOnClearFilters}
        />,
      );

      expect(getByText('No tokens match your filters')).toBeOnTheScreen();

      expect(queryByText('No tokens available')).toBeNull();
    });

    it('shows tokens normally when tokens exist regardless of filter state', () => {
      const { getByTestId, queryByText } = render(
        <TokenList
          tokens={mockTokens}
          hasActiveFilters
          onClearFilters={jest.fn()}
        />,
      );

      expect(getByTestId('token-ETH')).toBeOnTheScreen();
      expect(getByTestId('token-USDC')).toBeOnTheScreen();

      expect(queryByText('No tokens match your filters')).toBeNull();
      expect(queryByText('No tokens available')).toBeNull();
    });
  });
});
