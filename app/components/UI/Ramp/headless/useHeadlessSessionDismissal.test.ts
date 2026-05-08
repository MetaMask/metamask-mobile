import { renderHook } from '@testing-library/react-native';

import {
  __resetSessionRegistryForTests,
  closeSession,
  createSession,
  failSession,
} from './sessionRegistry';
import type { HeadlessBuyCallbacks, HeadlessBuyParams } from './types';
import type { Quote } from '../types';

import { useHeadlessSessionDismissal } from './useHeadlessSessionDismissal';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const mockQuote = {
  provider: '/providers/transak-native',
  quote: {
    amountIn: 25,
    amountOut: 0.01,
    paymentMethod: '/payments/debit-credit-card',
  },
  providerInfo: {
    id: '/providers/transak-native',
    name: 'Transak',
    type: 'native' as const,
  },
} as unknown as Quote;

const baseParams: HeadlessBuyParams = {
  quote: mockQuote,
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
  jest.clearAllMocks();
});

describe('useHeadlessSessionDismissal', () => {
  it('fires onClose({ reason: "user_dismissed" }) when the host unmounts with a live session', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      {
        initialProps: session.id,
      },
    );

    expect(callbacks.onClose).not.toHaveBeenCalled();

    unmount();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
  });

  it('no-ops on unmount after Phase 6 success already closed the session', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      {
        initialProps: session.id,
      },
    );

    // Simulate Phase 6 onOrderCreated success: registry's closeSession with
    // 'completed' fires onClose and removes the session.
    closeSession(session.id, { reason: 'completed' });
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'completed' });

    unmount();

    // Unmount must not produce a second onClose.
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('no-ops on unmount after Phase 7 failSession already closed the session', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      {
        initialProps: session.id,
      },
    );

    failSession(session.id, new Error('boom'), 'AUTH_FAILED');
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });

    unmount();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('no-ops on unmount after the consumer cancelled the session', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      {
        initialProps: session.id,
      },
    );

    closeSession(session.id, { reason: 'consumer_cancelled' });
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({
      reason: 'consumer_cancelled',
    });

    unmount();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not fire on re-render when the session id is stable', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender, unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      { initialProps: session.id },
    );

    rerender(session.id);
    rerender(session.id);

    expect(callbacks.onClose).not.toHaveBeenCalled();

    unmount();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('fires for the old session when the id changes to a new live session', () => {
    const firstCallbacks = buildCallbacks();
    const firstSession = createSession(baseParams, firstCallbacks);
    const secondCallbacks = buildCallbacks();
    const secondSession = createSession(baseParams, secondCallbacks);

    const { rerender, unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      { initialProps: firstSession.id },
    );

    rerender(secondSession.id);

    expect(firstCallbacks.onClose).toHaveBeenCalledTimes(1);
    expect(firstCallbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
    expect(secondCallbacks.onClose).not.toHaveBeenCalled();

    unmount();

    expect(secondCallbacks.onClose).toHaveBeenCalledTimes(1);
    expect(secondCallbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
    expect(firstCallbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('no-ops when mounted with an undefined session id', () => {
    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      { initialProps: undefined as string | undefined },
    );

    // No session means no callbacks to call — just confirm unmount is safe
    // and produces no thrown errors.
    expect(() => unmount()).not.toThrow();
  });

  it('no-ops when mounted with an unknown session id', () => {
    const { unmount } = renderHook(
      (id: string | undefined) => useHeadlessSessionDismissal(id),
      { initialProps: 'unknown-id' as string | undefined },
    );

    expect(() => unmount()).not.toThrow();
  });
});
