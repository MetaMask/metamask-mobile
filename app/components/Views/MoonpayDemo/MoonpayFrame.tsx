/**
 * MoonpayFrame — embeds a MoonPay Check, Auth, or Challenge frame in a
 * React Native WebView and bridges postMessage events back to JS.
 *
 * The frames at https://blocks.moonpay.com/platform/v1/... are designed for
 * an HTML <iframe> context where they call `window.parent.postMessage(...)`
 * to talk to the host. In React Native the loaded page IS the top window,
 * so we inject a polyfill that re-routes `window.parent.postMessage` (and
 * the bare `window.postMessage` form) into `window.ReactNativeWebView`. The
 * RN side then receives them through `onMessage`.
 *
 * The exact frame protocol is documented in
 * MoonPay's "Check frame reference" / "Challenge frame reference" docs —
 * this component intentionally stays protocol-agnostic and forwards raw
 * message payloads. Parsing happens in the parent component.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';

// Origin allowlist per the Integration Guide. Always reject messages from
// any other origin before reading their payload.
export const MOONPAY_FRAMES_ORIGIN = 'https://blocks.moonpay.com';

// JS injected into the frame to (a) capture `window.parent.postMessage` and
// `window.postMessage` calls and (b) forward them to React Native as a JSON
// envelope. The envelope preserves the original message + an `origin`
// stand-in so the RN side can apply its own allowlist check.
const POSTMESSAGE_BRIDGE = `
(function() {
  if (window.__moonpayBridgeInstalled) return;
  window.__moonpayBridgeInstalled = true;

  function forward(message, originHint) {
    try {
      var envelope = {
        __moonpayBridge: true,
        // Origin the page would normally check via event.origin. We can't
        // reconstruct it perfectly, so we send the page's own origin —
        // RN-side compares against the URL we loaded.
        origin: window.location.origin,
        targetOrigin: originHint || null,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        rawType: typeof message,
      };
      window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
    } catch (e) {
      // Swallow — bridging errors must not crash the frame.
    }
  }

  // Override window.parent.postMessage. In a WebView, window.parent === window,
  // so we patch the property to a proxy that forwards instead of looping back
  // into our own message listeners.
  try {
    var parentProxy = new Proxy({}, {
      get: function(_, prop) {
        if (prop === 'postMessage') {
          return function(message, targetOrigin) { forward(message, targetOrigin); };
        }
        // Fall through to the real window for everything else.
        return window[prop];
      },
    });
    Object.defineProperty(window, 'parent', {
      configurable: true,
      get: function() { return parentProxy; },
    });
  } catch (e) {}

  // Some MoonPay frames call window.postMessage(msg, '*') directly. Wrap it so
  // (a) we still deliver to local listeners (default behavior) and (b) we also
  // forward to RN.
  var originalPostMessage = window.postMessage.bind(window);
  window.postMessage = function(message, targetOrigin, transfer) {
    forward(message, targetOrigin);
    return originalPostMessage(message, targetOrigin, transfer);
  };

  // \`true;\` is required by react-native-webview as the last statement of
  // injectedJavaScript so the result is a primitive.
})();
true;
`;

export interface MoonpayFrameMessage {
  // Decoded message payload — the value the frame originally passed to
  // postMessage. If the frame sent a JSON string we parse it back into an
  // object; otherwise it's returned as-is.
  message: unknown;
  // The origin the frame intended for the message ("*", or a specific URL).
  targetOrigin: string | null;
  // The page's own origin (sanity-check that the WebView loaded the expected
  // MoonPay domain).
  origin: string;
  // Send a message back INTO the frame. In a normal iframe integration the
  // host replies via `event.source.postMessage(...)`; here the frame is the
  // top-level WebView window, so we deliver a synthetic `message` event to
  // its own `window`. Used to answer the frame's handshake with an ack.
  reply: (message: unknown) => void;
}

export interface MoonpayFrameProps {
  // The fully-qualified URL of the Check, Auth, or Challenge frame, with all
  // required query params already attached.
  url: string;
  // Called for every postMessage forwarded from the frame. Only invoked
  // after the origin allowlist check passes.
  onMessage: (msg: MoonpayFrameMessage) => void;
  // Surface non-fatal errors (HTTP failures, etc.).
  onError?: (err: string) => void;
  // Debug hook: fires for every message received from the WebView before
  // any filtering (origin allowlist, bridge envelope check). Useful when
  // the frame is silent and you need to confirm the bridge is wired up.
  onRawMessage?: (raw: string) => void;
  // Debug hooks for WebView navigation lifecycle.
  onLoadStart?: (url: string) => void;
  onLoadEnd?: (url: string) => void;
  // Hide the WebView. Used for the invisible Check frame in Step 3a.
  invisible?: boolean;
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  invisible: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

const MoonpayFrame: React.FC<MoonpayFrameProps> = ({
  url,
  onMessage,
  onError,
  onRawMessage,
  onLoadStart,
  onLoadEnd,
  invisible,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const containerStyle = useMemo(
    () => [invisible ? styles.invisible : styles.container, style],
    [invisible, style],
  );

  // Deliver a message back into the frame. We dispatch a synthetic `message`
  // event on the frame's `window` to mimic what the iframe host's
  // `event.source.postMessage(...)` would produce. `origin` is set to the
  // frame's own origin and `source` to our `window.parent` proxy so the
  // frame's listener sees a plausible parent reply.
  const reply = useCallback((message: unknown) => {
    const serialized =
      typeof message === 'string' ? message : JSON.stringify(message);
    const js = `(function () {
      try {
        var data = ${JSON.stringify(serialized)};
        var init = { data: data, origin: ${JSON.stringify(
          MOONPAY_FRAMES_ORIGIN,
        )} };
        try { init.source = window.parent; } catch (e) {}
        var ev;
        try {
          ev = new MessageEvent('message', init);
        } catch (e) {
          delete init.source;
          ev = new MessageEvent('message', init);
        }
        window.dispatchEvent(ev);
      } catch (e) {}
      true;
    })();
    true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;
      onRawMessage?.(raw);

      let envelope: {
        __moonpayBridge?: boolean;
        origin?: string;
        targetOrigin?: string | null;
        message?: string;
        rawType?: string;
      };
      try {
        envelope = JSON.parse(raw);
      } catch (err) {
        onError?.(`Non-JSON message from frame: ${raw.slice(0, 80)}`);
        return;
      }

      if (!envelope.__moonpayBridge) {
        // Some MoonPay frames detect `window.ReactNativeWebView` and post
        // their protocol messages straight to it, bypassing our
        // window.parent/postMessage bridge. Those arrive here as the raw,
        // un-enveloped MoonPay message. Route anything that looks like a
        // frame protocol message (has a `kind`) through to `onMessage`;
        // silently drop the rest (e.g. native IFRAME_DETECTED noise).
        //
        // We can't verify the sender's origin for these (there's no envelope
        // origin), but the WebView only ever loads `url` on
        // blocks.moonpay.com and `originWhitelist` blocks navigation
        // elsewhere, so we attribute them to MOONPAY_FRAMES_ORIGIN.
        const direct = envelope as { kind?: unknown };
        if (typeof direct.kind === 'string') {
          onMessage({
            message: direct,
            targetOrigin: null,
            origin: MOONPAY_FRAMES_ORIGIN,
            reply,
          });
        }
        return;
      }

      // Origin allowlist: the loaded page must be on blocks.moonpay.com.
      if (envelope.origin !== MOONPAY_FRAMES_ORIGIN) {
        onError?.(
          `Rejected message from disallowed origin: ${envelope.origin}`,
        );
        return;
      }

      let parsedMessage: unknown = envelope.message;
      if (envelope.rawType !== 'string') {
        // Bridge stringified everything; reparse non-string payloads back
        // into JS values.
        try {
          parsedMessage = JSON.parse(envelope.message ?? 'null');
        } catch {
          // Leave as raw string if the original wasn't valid JSON.
        }
      } else if (typeof envelope.message === 'string') {
        // String payloads are often themselves JSON (MoonPay envelope shape).
        try {
          parsedMessage = JSON.parse(envelope.message);
        } catch {
          // Plain string — pass through.
        }
      }

      onMessage({
        message: parsedMessage,
        targetOrigin: envelope.targetOrigin ?? null,
        origin: envelope.origin,
        reply,
      });
    },
    [onMessage, onError, onRawMessage, reply],
  );

  return (
    <View style={containerStyle}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={POSTMESSAGE_BRIDGE}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        originWhitelist={[MOONPAY_FRAMES_ORIGIN, 'https://*.moonpay.com']}
        onLoadStart={(e) => onLoadStart?.(e.nativeEvent.url)}
        onLoadEnd={(e) => onLoadEnd?.(e.nativeEvent.url)}
        onError={(e) =>
          onError?.(`WebView error: ${e.nativeEvent.description}`)
        }
        onHttpError={(e) =>
          onError?.(`HTTP ${e.nativeEvent.statusCode} loading ${url}`)
        }
      />
    </View>
  );
};

export default MoonpayFrame;
