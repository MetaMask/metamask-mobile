/**
 * useMoonpayFrame — hook that manages a MoonPay WebView frame's message
 * bridging, origin validation, and reply mechanics.
 *
 */

import { useCallback, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';

export const MOONPAY_FRAMES_ORIGIN = 'https://blocks.moonpay.com';

export const POSTMESSAGE_BRIDGE = `
(function() {
  if (window.__moonpayBridgeInstalled) return;
  window.__moonpayBridgeInstalled = true;

  function forward(message, originHint) {
    try {
      var envelope = {
        __moonpayBridge: true,
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

  // MoonPay's messaging transport talks to React Native directly via
  // window.ReactNativeWebView.postMessage, so the frame's outbound messages
  // (handshake, etc.) reach us without any parent shim. We still expose a proxy
  // window.parent so any code path that does use it degrades gracefully.
  try {
    var parentProxy = new Proxy({}, {
      get: function(_, prop) {
        if (prop === 'postMessage') {
          return function(message, targetOrigin) { forward(message, targetOrigin); };
        }
        return window[prop];
      },
    });
    Object.defineProperty(window, 'parent', {
      configurable: true,
      get: function() { return parentProxy; },
    });
  } catch (e) {}

  var originalPostMessage = window.postMessage.bind(window);
  window.postMessage = function(message, targetOrigin, transfer) {
    forward(message, targetOrigin);
    return originalPostMessage(message, targetOrigin, transfer);
  };
})();
true;
`;

export interface MoonpayFrameMessage {
  message: unknown;
  targetOrigin: string | null;
  origin: string;
  reply: (message: unknown) => void;
}

interface UseMoonpayFrameParams {
  onMessage: (msg: MoonpayFrameMessage) => void;
  onError?: (err: string) => void;
  onRawMessage?: (raw: string) => void;
  invisible?: boolean;
  style?: StyleProp<ViewStyle>;
}

const frameStyles = StyleSheet.create({
  container: { flex: 1 },
  invisible: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

const useMoonpayFrame = ({
  onMessage,
  onError,
  onRawMessage,
  invisible,
  style,
}: UseMoonpayFrameParams) => {
  const webViewRef = useRef<WebView>(null);

  const containerStyle = useMemo(
    () => [invisible ? frameStyles.invisible : frameStyles.container, style],
    [invisible, style],
  );

  const reply = useCallback((message: unknown) => {
    const serialized =
      typeof message === 'string' ? message : JSON.stringify(message);
    const js = `(function () {
      try {
        // Deliver the ack the way MoonPay's PostMessenger expects. Its
        // ReactNative transport only calls handleMessage when
        // event.source === null && typeof event.data === 'string', and it
        // registers its listener on 'window' under WKWebView (iOS) but on
        // 'document' under the Android System WebView. So we dispatch a
        // string-payload MessageEvent with a null source on BOTH targets.
        var data = ${JSON.stringify(serialized)};
        function makeEvent() {
          try {
            return new MessageEvent('message', { data: data, source: null });
          } catch (e) {
            return new MessageEvent('message', { data: data });
          }
        }
        try { document.dispatchEvent(makeEvent()); } catch (e) {}
        try { window.dispatchEvent(makeEvent()); } catch (e) {}
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

      if (envelope.origin !== MOONPAY_FRAMES_ORIGIN) {
        onError?.(
          `Rejected message from disallowed origin: ${envelope.origin}`,
        );
        return;
      }

      let parsedMessage: unknown = envelope.message;
      if (envelope.rawType !== 'string') {
        try {
          parsedMessage = JSON.parse(envelope.message ?? 'null');
        } catch {
          // Leave as raw string if the original wasn't valid JSON.
        }
      } else if (typeof envelope.message === 'string') {
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

  return {
    webViewRef,
    containerStyle,
    handleMessage,
  };
};

export default useMoonpayFrame;
