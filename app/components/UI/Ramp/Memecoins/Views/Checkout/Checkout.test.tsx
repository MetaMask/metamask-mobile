import React from 'react';
import { render } from '@testing-library/react-native';
import Checkout from './Checkout';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      checkoutUrl:
        'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=1',
      orderId: 'order-1',
      tokenName: 'XMEME',
      amountUsd: '5',
    },
  }),
}));

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WebView: View,
  };
});

describe('Memecoins Checkout', () => {
  it('renders checkout webview screen', () => {
    const { toJSON, getByTestId } = render(<Checkout />);

    expect(getByTestId('memecoins-checkout-screen')).toBeOnTheScreen();
    expect(toJSON()).toMatchSnapshot();
  });
});
