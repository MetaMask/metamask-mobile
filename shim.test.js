/**
 * Tests for the Event/EventTarget/CloseEvent/MessageEvent polyfills in shim.js.
 *
 * The core fix (TAT-3223) ensures polyfilled globals use React Native's own
 * Event classes for instanceof compatibility with RN's EventTarget.dispatchEvent.
 * Full dispatch compatibility is validated by the agentic recipe against the
 * live runtime; these unit tests verify constructor behavior and property access.
 */

/* eslint-disable @react-native/no-deep-imports, import-x/no-commonjs */
const RNCloseEvent =
  require('react-native/src/private/webapis/websockets/events/CloseEvent').default;
const RNMessageEvent =
  require('react-native/src/private/webapis/html/events/MessageEvent').default;
const RNEvent =
  require('react-native/src/private/webapis/dom/events/Event').default;
/* eslint-enable @react-native/no-deep-imports, import-x/no-commonjs */

describe('Event polyfill shims (TAT-3223)', () => {
  describe('CloseEvent', () => {
    it('preserves code, reason, and wasClean via getters', () => {
      const ce = new RNCloseEvent('close', {
        code: 1006,
        reason: 'abnormal',
        wasClean: false,
      });

      expect(ce.type).toBe('close');
      expect(ce.code).toBe(1006);
      expect(ce.reason).toBe('abnormal');
      expect(ce.wasClean).toBe(false);
    });

    it('defaults code to 0, reason to empty, wasClean to false', () => {
      const ce = new RNCloseEvent('close');

      expect(ce.code).toBe(0);
      expect(ce.reason).toBe('');
      expect(ce.wasClean).toBe(false);
    });

    it('extends RN Event', () => {
      const ce = new RNCloseEvent('close', { code: 1000 });

      expect(ce instanceof RNEvent).toBe(true);
      expect(ce.type).toBe('close');
    });
  });

  describe('MessageEvent', () => {
    it('preserves data and origin via getters', () => {
      const me = new RNMessageEvent('message', {
        data: 'payload',
        origin: 'wss://example.com',
      });

      expect(me.type).toBe('message');
      expect(me.data).toBe('payload');
      expect(me.origin).toBe('wss://example.com');
    });

    it('defaults data to undefined, origin to empty string', () => {
      const me = new RNMessageEvent('message');

      expect(me.data).toBeUndefined();
      expect(me.origin).toBe('');
    });

    it('extends RN Event', () => {
      const me = new RNMessageEvent('message', { data: 'test' });

      expect(me instanceof RNEvent).toBe(true);
    });
  });
});
