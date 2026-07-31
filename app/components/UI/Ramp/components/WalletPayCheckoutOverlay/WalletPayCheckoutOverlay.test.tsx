import React from 'react';
import { render } from '@testing-library/react-native';
import WalletPayCheckoutOverlay from './WalletPayCheckoutOverlay';
import { WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS } from './WalletPayCheckoutOverlay.testIds';

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ({
      testID,
      source,
    }: {
      testID?: string;
      source: { uri: string };
    }) => <View testID={testID} accessibilityLabel={source.uri} />,
  };
});

jest.mock('../../../../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: jest.fn(() => true),
    isAndroid: jest.fn(() => false),
  },
}));

const CHECKOUT_URL =
  'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=abc';

describe('WalletPayCheckoutOverlay', () => {
  it('renders the checkout WebView with the provided URL', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive
        onMessage={jest.fn()}
      />,
    );

    const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);
    expect(webView.props.accessibilityLabel).toBe(CHECKOUT_URL);
  });

  it('receives taps when interactive', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive
        onMessage={jest.fn()}
      />,
    );

    const host = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY);
    expect(host.props.pointerEvents).toBe('auto');
  });

  it('ignores taps when not interactive', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive={false}
        onMessage={jest.fn()}
      />,
    );

    const host = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY);
    expect(host.props.pointerEvents).toBe('none');
  });
});
