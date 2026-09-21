import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import WalletPayCheckoutOverlay from './WalletPayCheckoutOverlay';
import { WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS } from './WalletPayCheckoutOverlay.testIds';

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    // Forwards the callbacks so tests can drive the checkout's own readiness
    // signal rather than assuming a load order.
    WebView: ({
      testID,
      source,
      onMessage,
      onLoadEnd,
    }: {
      testID?: string;
      source: { uri: string };
      onMessage?: (event: unknown) => void;
      onLoadEnd?: () => void;
    }) => (
      <View
        testID={testID}
        accessibilityLabel={source.uri}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
      />
    ),
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
const NEXT_CHECKOUT_URL =
  'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=def';

interface MockWebView {
  props: {
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
  };
}

type WalletPayCheckoutOverlayProps = React.ComponentProps<
  typeof WalletPayCheckoutOverlay
>;

/** Drives Crossmint's own "the payment button has rendered" event. */
function reportCheckoutReady(webView: MockWebView) {
  act(() => {
    webView.props.onMessage?.({
      nativeEvent: {
        data: JSON.stringify({ event: 'ui:express-checkout.ready' }),
      },
    });
  });
}

/** Drives the content-height event Crossmint posts from its ResizeObserver. */
function reportHeight(webView: MockWebView, height: unknown) {
  act(() => {
    webView.props.onMessage?.({
      nativeEvent: {
        data: JSON.stringify({
          event: 'ui:height.changed',
          data: { height },
        }),
      },
    });
  });
}

/**
 * The full sequence before the checkout may be shown: the express-checkout
 * ready event, then a non-zero height.
 */
function completeReadySequence(webView: MockWebView) {
  reportCheckoutReady(webView);
  reportHeight(webView, 120);
}

/** Runs the crossfade over Continue to its end, where ready is reported. */
function finishReveal() {
  act(() => {
    jest.advanceTimersByTime(AnimationDuration.Promptly);
  });
}

function overlayStyle(view: ReturnType<typeof render>) {
  return (
    StyleSheet.flatten(
      view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.ROOT).props.style,
    ) ?? {}
  );
}

function KeyedWalletPayCheckoutOverlay({
  checkoutUrl,
  ...props
}: WalletPayCheckoutOverlayProps) {
  return (
    <WalletPayCheckoutOverlay
      key={checkoutUrl}
      checkoutUrl={checkoutUrl}
      {...props}
    />
  );
}

describe('WalletPayCheckoutOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the checkout WebView with the provided URL', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive
        onMessage={jest.fn()}
        onReady={jest.fn()}
      />,
    );

    const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);
    expect(webView.props.accessibilityLabel).toBe(CHECKOUT_URL);
  });

  it('receives taps once the payment button has rendered', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive
        onMessage={jest.fn()}
        onReady={jest.fn()}
      />,
    );

    const host = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY);
    expect(host.props.pointerEvents).toBe('none');

    completeReadySequence(
      getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
    );

    // Still fading in over Continue: a tap here would hit both.
    expect(
      getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY).props
        .pointerEvents,
    ).toBe('none');

    finishReveal();

    expect(
      getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY).props
        .pointerEvents,
    ).toBe('auto');
  });

  it('ignores taps when not interactive', () => {
    const { getByTestId } = render(
      <WalletPayCheckoutOverlay
        checkoutUrl={CHECKOUT_URL}
        interactive={false}
        onMessage={jest.fn()}
        onReady={jest.fn()}
      />,
    );

    completeReadySequence(
      getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
    );
    finishReveal();

    const host = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY);
    expect(host.props.pointerEvents).toBe('none');
  });

  describe('reveal', () => {
    function renderOverlay(onReady = jest.fn()) {
      return render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );
    }

    it('loads off the layout at full size, so the button paints before it shows', () => {
      const view = renderOverlay();

      const style = overlayStyle(view);
      expect(style.position).toBe('absolute');
      expect(style.opacity).toBe(0);
      // Clipping to zero height left WebKit nothing to paint into.
      expect(style.height).toBeUndefined();
      expect(style.overflow).toBeUndefined();
    });

    it('fades in over Continue before reporting ready', () => {
      const onReady = jest.fn();
      const view = renderOverlay(onReady);

      completeReadySequence(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );

      const style = overlayStyle(view);
      expect(style.position).toBe('absolute');
      expect(style.zIndex).toBe(1);
      expect(style.backgroundColor).toBeDefined();
      expect(onReady).not.toHaveBeenCalled();

      finishReveal();

      expect(onReady).toHaveBeenCalledTimes(1);
      expect(overlayStyle(view).position).toBeUndefined();
    });

    it('hides again while concealed, without unmounting the checkout', () => {
      const onReady = jest.fn();
      const props = { interactive: true, onMessage: jest.fn(), onReady };
      const view = render(
        <WalletPayCheckoutOverlay checkoutUrl={CHECKOUT_URL} {...props} />,
      );
      completeReadySequence(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      finishReveal();
      expect(overlayStyle(view).position).toBeUndefined();

      view.rerender(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          concealed
          {...props}
        />,
      );

      const style = overlayStyle(view);
      expect(style.position).toBe('absolute');
      expect(style.opacity).toBe(0);
      expect(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY).props
          .pointerEvents,
      ).toBe('none');
      expect(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      ).toBeTruthy();
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('does not report ready when unmounted mid-fade', () => {
      const onReady = jest.fn();
      const view = renderOverlay(onReady);

      completeReadySequence(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      view.unmount();
      finishReveal();

      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('reports ready once a height follows the checkout event', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);
      expect(onReady).not.toHaveBeenCalled();

      // Crossmint's own terms line is still painted at this point, so the
      // checkout stays hidden through their ready event.
      reportCheckoutReady(webView);
      expect(onReady).not.toHaveBeenCalled();

      reportHeight(webView, 120);
      finishReveal();
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('stays hidden for a height reported before the checkout event', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);

      // Their observer reports the page as it builds; only a height after the
      // payment button mounts means the flash is over.
      reportHeight(webView, 120);
      finishReveal();
      expect(onReady).not.toHaveBeenCalled();
    });

    it('ignores a zero height after the checkout event', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);
      reportCheckoutReady(webView);
      reportHeight(webView, 0);
      finishReveal();

      expect(onReady).not.toHaveBeenCalled();
    });

    it('reports ready only once across repeated events', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);
      completeReadySequence(webView);
      finishReveal();
      reportHeight(webView, 140);
      reportCheckoutReady(webView);
      finishReveal();

      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('requires the replacement checkout URL to report ready', () => {
      const onReady = jest.fn();
      const props = {
        interactive: true,
        onMessage: jest.fn(),
        onReady,
      };
      const { getByTestId, rerender } = render(
        <KeyedWalletPayCheckoutOverlay checkoutUrl={CHECKOUT_URL} {...props} />,
      );

      completeReadySequence(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      finishReveal();
      expect(onReady).toHaveBeenCalledTimes(1);

      rerender(
        <KeyedWalletPayCheckoutOverlay
          checkoutUrl={NEXT_CHECKOUT_URL}
          {...props}
        />,
      );

      expect(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY).props
          .pointerEvents,
      ).toBe('none');

      completeReadySequence(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      finishReveal();
      expect(onReady).toHaveBeenCalledTimes(2);
    });

    it('still forwards messages to the caller', () => {
      const onMessage = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={onMessage}
          onReady={jest.fn()}
        />,
      );

      completeReadySequence(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );

      expect(onMessage).toHaveBeenCalledTimes(2);
    });

    it('falls back when the checkout event arrives but no height follows', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      reportCheckoutReady(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      finishReveal();

      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('does not reveal on the load-end deadline once the page has posted a message', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );
      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);

      act(() => {
        webView.props.onLoadEnd?.();
      });
      // Their first height report arrives well before their ready event, and
      // proves the bridge works, so the short deadline must stand down.
      reportHeight(webView, 0);

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      finishReveal();
      expect(onReady).not.toHaveBeenCalled();

      completeReadySequence(webView);
      finishReveal();
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('still reveals eventually when the bridge works but ready never comes', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );
      const webView = getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW);

      reportHeight(webView, 0);
      act(() => {
        webView.props.onLoadEnd?.();
      });

      act(() => {
        jest.advanceTimersByTime(8000);
      });
      finishReveal();
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('falls back to a timeout after load, for platforms that post no events', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={onReady}
        />,
      );

      act(() => {
        getByTestId(
          WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW,
        ).props.onLoadEnd?.();
      });

      // iOS never delivers the event, so load end only starts the clock.
      expect(onReady).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      finishReveal();

      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('content height', () => {
    function renderOverlay() {
      const view = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={jest.fn()}
        />,
      );
      reportCheckoutReady(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      return view;
    }

    function hostHeight(view: ReturnType<typeof renderOverlay>) {
      return StyleSheet.flatten(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY).props
          .style,
      ).height;
    }

    it('sizes the host to the reported height less the crop', () => {
      const view = renderOverlay();
      const before = hostHeight(view);

      reportHeight(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
        120,
      );

      expect(hostHeight(view)).not.toBe(before);
      expect(hostHeight(view)).toBe(120 - 24);
    });

    it.each([
      ['a height inside the crop', 10],
      ['a runaway height', 5000],
      ['a non-numeric height', 'tall'],
    ])('ignores %s', (_label, reported) => {
      const view = renderOverlay();
      const before = hostHeight(view);

      reportHeight(
        view.getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
        reported,
      );

      expect(hostHeight(view)).toBe(before);
    });
  });

  describe('terms notice', () => {
    // Linking.openURL is already a jest.fn from the RN preset, so spying on it
    // returns the same mock and its calls carry over between tests.
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('opens Crossmint terms of service', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={jest.fn()}
        />,
      );
      completeReadySequence(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      finishReveal();

      fireEvent.press(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.TERMS_LINK),
      );

      // Crossmint requires this exact regional agreement, not the generic
      // /legal/terms-of-service page.
      expect(openURL).toHaveBeenCalledWith(
        'https://www.crossmint.com/legal/crossmint-terms-of-service/FRGUSAALLALLALL',
      );
    });

    it('stays tappable while the payment button is not interactive', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive={false}
          onMessage={jest.fn()}
          onReady={jest.fn()}
        />,
      );
      completeReadySequence(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW),
      );
      finishReveal();

      // The notice sits outside the host that drops taps, so the user can
      // always read the terms even before the quote settles.
      fireEvent.press(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.TERMS_LINK),
      );
      expect(openURL).toHaveBeenCalled();
    });

    it('takes no taps while hidden behind Continue', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByTestId } = render(
        <WalletPayCheckoutOverlay
          checkoutUrl={CHECKOUT_URL}
          interactive
          onMessage={jest.fn()}
          onReady={jest.fn()}
        />,
      );

      fireEvent.press(
        getByTestId(WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.TERMS_LINK),
      );

      expect(openURL).not.toHaveBeenCalled();
    });
  });
});
