// Typed bridge between the WebView IIFE and React Native.
//
// Wraps the same window.ReactNativeWebView.postMessage(...) call shape that
// legacy chartLogic.js's sendToReactNative() uses, so the RN-side
// parseWebViewMessage in AdvancedChart.types.ts decodes our messages without
// any change to its consumers.

import type {
  InboundMessage,
  OutboundMessageType,
  OutboundPayloads,
} from '../messages/contract';

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'Unknown error';
  } catch {
    return String(value);
  }
}

/**
 * Posts a typed message to React Native via window.ReactNativeWebView.
 * Equivalent to legacy `sendToReactNative(type, payload)` at chartLogic.js
 * line ~98. Silently no-ops when window.ReactNativeWebView is absent (e.g.
 * during unit tests in a jsdom environment without the RN bridge stub).
 */
export function postToRN<T extends OutboundMessageType>(
  type: T,
  payload: OutboundPayloads[T],
): void {
  const bridge = window.ReactNativeWebView;
  if (!bridge) {
    return;
  }
  try {
    bridge.postMessage(JSON.stringify({ type, payload }));
  } catch {
    // postMessage / JSON.stringify failure: nothing to do — the WebView
    // cannot inform RN of its own bridge failure.
  }
}

/**
 * Reports a runtime error to React Native via the ERROR channel. Matches the
 * legacy `sendToReactNative('ERROR', { message })` pattern used throughout
 * chartLogic.js.
 */
export function reportErrorToRN(error: unknown): void {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = safeStringify(error);
  }
  postToRN('ERROR', { message });
}

export type InboundMessageHandler = (message: InboundMessage) => void;

/**
 * Registers a single inbound listener. React Native posts JSON strings via
 * webView.postMessage; the WebView receives them on window 'message' on iOS
 * and document 'message' on Android (see chartLogic.js line ~400). We
 * subscribe to both so consumers don't have to.
 *
 * The returned function unsubscribes — useful for tests; the real bundle
 * subscribes once at bootstrap and never unsubscribes.
 */
export function onFromRN(handler: InboundMessageHandler): () => void {
  const dispatch = (event: MessageEvent): void => {
    // RN WebView inline HTML: native bridge messages arrive with an empty
    // or "null" origin. Reject messages from real web origins.
    const origin = event.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return;
    }

    let parsed: unknown;
    try {
      parsed =
        typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (parseError) {
      reportErrorToRN(parseError);
      return;
    }
    if (!parsed || typeof parsed !== 'object') {
      return;
    }
    const candidate = parsed as { type?: unknown };
    if (typeof candidate.type !== 'string') {
      return;
    }
    // Trusting the type narrowing here is fine because messages/handler.ts
    // re-validates via a switch on candidate.type before dispatching to a
    // typed handler. Phase 1 only routes SET_THEME_COLORS, but the listener
    // forwards every well-formed message so the handler can decide.
    handler(parsed as InboundMessage);
  };

  // iOS posts arrive on window; Android posts arrive on document. Subscribe
  // to both to match legacy chartLogic.js handleMessage wiring.
  window.addEventListener('message', dispatch as EventListener);
  document.addEventListener('message', dispatch as EventListener);

  return () => {
    window.removeEventListener('message', dispatch as EventListener);
    document.removeEventListener('message', dispatch as EventListener);
  };
}

/** Re-export for callers that want the type tag union. */
export type { InboundMessageType } from '../messages/contract';
