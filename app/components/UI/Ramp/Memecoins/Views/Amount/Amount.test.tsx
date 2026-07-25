import React from 'react';
import { render } from '@testing-library/react-native';
import Amount from './Amount';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      tokenLocator: 'solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu',
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

describe('Memecoins Amount', () => {
  it('renders amount presets and Apple Pay CTA', () => {
    const { toJSON, getByTestId } = render(<Amount />);

    expect(getByTestId('memecoins-apple-pay-button')).toBeOnTheScreen();
    expect(toJSON()).toMatchSnapshot();
  });
});
