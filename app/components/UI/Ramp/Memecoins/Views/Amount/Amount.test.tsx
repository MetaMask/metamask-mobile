import React from 'react';
import { render } from '@testing-library/react-native';
import Amount from './Amount';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTokenLocator = 'solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      tokenLocator: mockTokenLocator,
      chain: 'solana',
      name: 'XMEME',
      symbol: 'XMEME',
      imageUrl:
        'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
    },
  }),
}));

jest.mock('../../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => 'EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448',
}));

jest.mock('../../hooks/useMemecoinMarketData', () => ({
  useMemecoinMarketData: () => ({
    marketDataByLocator: {
      [mockTokenLocator]: {
        price: 0.00598,
        priceChange1d: -0.01,
        marketCap: 458_600_000,
        name: 'XMEME',
        symbol: 'XMEME',
        imageUrl:
          'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
      },
    },
    isMarketDataLoading: false,
  }),
}));

jest.mock('../../../../../Base/Keypad', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="mock-keypad">
        <Text>Keypad</Text>
      </View>
    ),
  };
});

jest.mock('../../../../Trending/components/TrendingTokenRowItem/utils', () => ({
  getNetworkBadgeSource: () => ({ uri: 'solana-badge' }),
}));

describe('Memecoins Amount', () => {
  it('renders FOMO quote layout with presets and buy CTA', () => {
    const { getByTestId, getByText } = render(<Amount />);

    expect(getByTestId('memecoins-apple-pay-button')).toBeOnTheScreen();
    expect(getByTestId('memecoins-amount-value')).toBeOnTheScreen();
    expect(getByTestId('memecoins-amount-preset-100')).toBeOnTheScreen();
    expect(getByText('$0 fee')).toBeOnTheScreen();
    expect(getByText('Buy')).toBeOnTheScreen();
  });
});
