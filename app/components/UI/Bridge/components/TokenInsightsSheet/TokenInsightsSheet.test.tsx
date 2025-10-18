import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TokenInsightsSheet from './TokenInsightsSheet';
import ClipboardManager from '../../../../../core/ClipboardManager';

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {
      token: {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: '0x1',
        balance: '100',
        balanceFiat: '$100.00',
        image: 'https://example.com/usdc.png',
        currencyExchangeRate: 1.0,
      },
      networkName: 'Ethereum Mainnet',
    },
  }),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

describe('TokenInsightsSheet', () => {
  it('renders correctly with token data', () => {
    const { getByText } = render(<TokenInsightsSheet />);

    expect(getByText('USDC Insights')).toBeTruthy();
    expect(getByText('Verified token')).toBeTruthy();
    expect(getByText('Price')).toBeTruthy();
    expect(getByText('$1.00')).toBeTruthy();
  });

  it('handles contract address copy', async () => {
    const { getByText } = render(<TokenInsightsSheet />);

    const addressText = getByText('0x1234...7890');
    fireEvent.press(addressText.parent);

    expect(ClipboardManager.setString).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
    );
  });
});
