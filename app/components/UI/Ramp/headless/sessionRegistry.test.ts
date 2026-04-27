import {
  __resetSessionRegistryForTests,
  createSession,
  endSession,
  getSession,
  setStatus,
} from './sessionRegistry';
import type { HeadlessBuyCallbacks, HeadlessBuyParams } from './types';

const baseParams: HeadlessBuyParams = {
  assetId: 'eip155:1/erc20:0xabc',
  amount: 25,
  paymentMethodId: '/payments/debit-credit-card',
};

function buildCallbacks(): HeadlessBuyCallbacks {
  return {
    onOrderCreated: jest.fn(),
    onError: jest.fn(),
    onClose: jest.fn(),
  };
}

beforeEach(() => {
  __resetSessionRegistryForTests();
  jest.useRealTimers();
});

describe('sessionRegistry', () => {
  describe('createSession', () => {
    it('returns a session with a unique id, pending status and a createdAt timestamp', () => {
      const before = Date.now();
      const session = createSession(baseParams, buildCallbacks());
      const after = Date.now();

      expect(session.id).toMatch(/^headless-buy-/);
      expect(session.status).toBe('pending');
      expect(session.params).toBe(baseParams);
      expect(session.createdAt).toBeGreaterThanOrEqual(before);
      expect(session.createdAt).toBeLessThanOrEqual(after);
    });

    it('does not produce duplicate ids across calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 25; i += 1) {
        ids.add(createSession(baseParams, buildCallbacks()).id);
      }
      expect(ids.size).toBe(25);
    });

    it('garbage-collects sessions older than 1 hour on each call', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
      const stale = createSession(baseParams, buildCallbacks());

      jest.setSystemTime(new Date('2026-04-20T13:00:00.001Z'));
      const fresh = createSession(baseParams, buildCallbacks());

      expect(getSession(stale.id)).toBeUndefined();
      expect(getSession(fresh.id)).toBeDefined();
    });

    it('keeps sessions younger than the TTL', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
      const recent = createSession(baseParams, buildCallbacks());

      jest.setSystemTime(new Date('2026-04-20T12:30:00Z'));
      createSession(baseParams, buildCallbacks());

      expect(getSession(recent.id)).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('returns the session for a known id', () => {
      const session = createSession(baseParams, buildCallbacks());
      expect(getSession(session.id)).toBe(session);
    });

    it('returns undefined for an unknown id', () => {
      expect(getSession('does-not-exist')).toBeUndefined();
    });

    it('returns undefined when called without an id', () => {
      expect(getSession(undefined)).toBeUndefined();
      expect(getSession('')).toBeUndefined();
    });
  });

  describe('setStatus', () => {
    it('mutates the session status when the id exists', () => {
      const session = createSession(baseParams, buildCallbacks());
      setStatus(session.id, 'continued');
      expect(getSession(session.id)?.status).toBe('continued');
    });

    it('is a no-op for unknown ids', () => {
      expect(() => setStatus('nope', 'completed')).not.toThrow();
    });
  });

  describe('endSession', () => {
    it('removes the session from the registry', () => {
      const session = createSession(baseParams, buildCallbacks());
      endSession(session.id);
      expect(getSession(session.id)).toBeUndefined();
    });

    it('is a no-op for unknown ids', () => {
      expect(() => endSession('nope')).not.toThrow();
    });
  });

  describe('callbacks', () => {
    it('stores the callbacks on the session by reference', () => {
      const callbacks = buildCallbacks();
      const session = createSession(baseParams, callbacks);
      const stored = getSession(session.id);
      expect(stored?.callbacks).toBe(callbacks);
      stored?.callbacks.onOrderCreated('order-1');
      expect(callbacks.onOrderCreated).toHaveBeenCalledWith('order-1');
    });
  });
});
