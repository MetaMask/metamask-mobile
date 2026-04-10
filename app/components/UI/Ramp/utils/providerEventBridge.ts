import Logger from '../../../../util/Logger';

/**
 * JavaScript injected into the provider WebView that intercepts all
 * `window.postMessage` calls and forwards them to the React Native
 * side via `window.ReactNativeWebView.postMessage`.
 *
 * DEV-ONLY — used to discover which events each provider emits so
 * we can build a production allowlist.
 */
export const PROVIDER_EVENT_BRIDGE_SCRIPT = `(function() {
  var _origPostMessage = window.postMessage;
  window.postMessage = function(data, targetOrigin) {
    try {
      var payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: '__PROVIDER_EVENT__',
          payload: payload,
          origin: targetOrigin || '*'
        }));
      }
    } catch (e) { /* swallow serialization errors */ }
    return _origPostMessage.apply(window, arguments);
  };

  window.addEventListener('message', function(event) {
    try {
      var payload = typeof event.data === 'string'
        ? event.data
        : JSON.stringify(event.data);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: '__PROVIDER_EVENT_RECEIVED__',
          payload: payload,
          origin: event.origin || '*'
        }));
      }
    } catch (e) { /* swallow serialization errors */ }
  });
})();`;

/**
 * Parses an `onMessage` event from the WebView and logs provider
 * events to the Metro console. Returns `true` if the message was
 * a provider event (so the caller can skip further processing),
 * `false` otherwise.
 *
 * Only active when `__DEV__` is true.
 */
export const handleProviderEventMessage = (
  rawData: string,
  providerName?: string,
): boolean => {
  if (!__DEV__) return false;

  try {
    const parsed = JSON.parse(rawData);
    if (
      parsed.type !== '__PROVIDER_EVENT__' &&
      parsed.type !== '__PROVIDER_EVENT_RECEIVED__'
    ) {
      return false;
    }

    let eventPayload: unknown;
    try {
      eventPayload = JSON.parse(parsed.payload);
    } catch {
      eventPayload = parsed.payload;
    }

    const direction =
      parsed.type === '__PROVIDER_EVENT__' ? 'SENT' : 'RECEIVED';

    Logger.log(
      `[Ramp Provider Event] [${direction}] provider=${providerName ?? 'unknown'} origin=${parsed.origin}\n${JSON.stringify(eventPayload, null, 2)}`,
    );

    return true;
  } catch {
    return false;
  }
};
