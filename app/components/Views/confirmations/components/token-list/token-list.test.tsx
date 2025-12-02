import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// eslint-disable-next-line import/no-namespace
import * as AssetSelectionMetrics from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { TokenList } from './token-list';
import { AssetType } from '../../types/token';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendContext } from '../../context/send-context';

const mockGotToSendScreen = jest.fn();

jest.mock('../../hooks/send/useSendScreenNavigation', () => ({
  useSendScreenNavigation: () => ({
    gotToSendScreen: mockGotToSendScreen,
  }),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../UI/token', () => {
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
  const mockUpdateAsset = jest.fn();
  const mockUseSendContext = jest.mocked(useSendContext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
      asset: undefined,
    } as unknown as ReturnType<typeof useSendContext>);
  });

  describe('token rendering', () => {
    it('renders tokens when provided', () => {
      const { getByTestId } = render(<TokenList tokens={mockTokens} />);

      expect(getByTestId('token-ETH')).toBeOnTheScreen();
      expect(getByTestId('token-USDC')).toBeOnTheScreen();
    });

    it('renders empty list when no tokens provided', () => {
      const { queryByTestId } = render(<TokenList tokens={[]} />);

      expect(queryByTestId('token-ETH')).toBeNull();
      expect(queryByTestId('token-USDC')).toBeNull();
    });

    it('renders single token correctly', () => {
      const singleToken = [mockTokens[0]];
      const { getByTestId } = render(<TokenList tokens={singleToken} />);

      expect(getByTestId('token-ETH')).toBeOnTheScreen();
    });
  });

  describe('token selection', () => {
    it('calls updateAsset and navigates to amount screen when token is pressed', () => {
      const { getByTestId } = render(<TokenList tokens={mockTokens} />);

      fireEvent.press(getByTestId('token-ETH'));

      expect(mockUpdateAsset).toHaveBeenCalledWith(mockTokens[0]);
      expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.AMOUNT);
    });

    it('calls updateTo when there is an existing asset selected', () => {
      const mockUpdateTo = jest.fn();
      mockUseSendContext.mockReturnValue({
        updateAsset: mockUpdateAsset,
        updateTo: mockUpdateTo,
        asset: mockTokens[0],
      } as unknown as ReturnType<typeof useSendContext>);

      const { getByTestId } = render(<TokenList tokens={mockTokens} />);

      fireEvent.press(getByTestId('token-ETH'));
      expect(mockUpdateTo).toHaveBeenCalledWith('');
    });

    it('handles second token press correctly', () => {
      const { getByTestId } = render(<TokenList tokens={mockTokens} />);

      fireEvent.press(getByTestId('token-USDC'));

      expect(mockUpdateAsset).toHaveBeenCalledWith(mockTokens[1]);
      expect(mockGotToSendScreen).toHaveBeenCalledWith(Routes.SEND.AMOUNT);
    });

    it('calls captureAssetSelected with correct asset and position', () => {
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

    it('calls onSelect prop only if provided', () => {
      const mockOnSelect = jest.fn();

      const { getByTestId } = render(
        <TokenList tokens={mockTokens} onSelect={mockOnSelect} />,
      );

      fireEvent.press(getByTestId('token-USDC'));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockTokens[1]);
      expect(mockUpdateAsset).not.toHaveBeenCalled();
      expect(mockGotToSendScreen).not.toHaveBeenCalled();
    });
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

    it('shows correct number of tokens after multiple "Show more" presses', () => {
      const largeTokenList = Array.from({ length: 50 }, (_, i) => ({
        ...mockTokens[0],
        address: `0x${i.toString().padStart(40, '0')}`,
        symbol: `TKN${i}`,
      }));

      const { getByText, queryByTestId } = render(
        <TokenList tokens={largeTokenList} />,
      );

      fireEvent.press(getByText('Show more tokens'));

      expect(queryByTestId('token-TKN39')).toBeOnTheScreen();
      expect(queryByTestId('token-TKN40')).toBeNull();

      fireEvent.press(getByText('Show more tokens'));

      expect(queryByTestId('token-TKN49')).toBeOnTheScreen();
    });
  });
});
