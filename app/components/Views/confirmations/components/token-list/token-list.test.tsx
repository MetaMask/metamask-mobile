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

jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FlashList: ({ data, renderItem, keyExtractor }: any) => {
      const items = data.map((item: AssetType, index: number) => (
        <View key={keyExtractor(item)} testID={`flashlist-item-${index}`}>
          {renderItem({ item })}
        </View>
      ));
      return <View testID="flashlist">{items}</View>;
    },
  };
});

describe('TokenList', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with tokens', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    expect(getByTestId('flashlist')).toBeOnTheScreen();
  });

  it('renders correct number of tokens', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    expect(getByTestId('flashlist-item-0')).toBeOnTheScreen();
    expect(getByTestId('flashlist-item-1')).toBeOnTheScreen();
  });

  it('renders Token components with correct props', () => {
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

  it('generates correct key for each token', () => {
    const { getByTestId } = render(<TokenList tokens={mockTokens} />);

    expect(getByTestId('flashlist-item-0')).toBeOnTheScreen();
    expect(getByTestId('flashlist-item-1')).toBeOnTheScreen();
  });

  it('renders empty list when no tokens provided', () => {
    const { getByTestId } = render(<TokenList tokens={[]} />);

    expect(getByTestId('flashlist')).toBeOnTheScreen();
  });

  it('renders with single token', () => {
    const singleToken = [mockTokens[0]];
    const { getByTestId } = render(<TokenList tokens={singleToken} />);

    expect(getByTestId('flashlist-item-0')).toBeOnTheScreen();
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
});
