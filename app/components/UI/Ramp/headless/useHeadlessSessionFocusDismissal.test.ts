import { act, renderHook } from '@testing-library/react-native';

import {
  __resetSessionRegistryForTests,
  closeSession,
  createSession,
  getSession,
} from './sessionRegistry';
import type { HeadlessBuyCallbacks, HeadlessBuyParams } from './types';
import type { Quote } from '../types';

import { useHeadlessSessionFocusDismissal } from './useHeadlessSessionFocusDismissal';

const mockNavigation = { goBack: jest.fn() };
const mockDismissHeadlessFlow = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('./headlessEntryNavigation', () => ({
  dismissHeadlessFlow: (navigation: unknown) =>
    mockDismissHeadlessFlow(navigation),
}));

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

function flushDismissalTimer() {
  act(() => {
    jest.runOnlyPendingTimers();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  __resetSessionRegistryForTests();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useHeadlessSessionFocusDismissal', () => {
  it('does not close on the initial focused host mount', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    renderHook(
      ({ isFocused }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused),
      { initialProps: { isFocused: true } },
    );

    flushDismissalTimer();

    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
    expect(getSession(session.id)).toBeDefined();
  });

  it('closes and dismisses when the host regains focus after a blur', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused),
      { initialProps: { isFocused: true } },
    );

    rerender({ isFocused: false });
    rerender({ isFocused: true });
    flushDismissalTimer();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
    expect(mockDismissHeadlessFlow).toHaveBeenCalledTimes(1);
    expect(mockDismissHeadlessFlow).toHaveBeenCalledWith(mockNavigation);
    expect(getSession(session.id)).toBeUndefined();
  });

  it('closes when a reset-built host mounts blurred and is later revealed', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused),
      { initialProps: { isFocused: false } },
    );

    rerender({ isFocused: true });
    flushDismissalTimer();

    expect(callbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
    expect(mockDismissHeadlessFlow).toHaveBeenCalledTimes(1);
    expect(getSession(session.id)).toBeUndefined();
  });

  it('does not close for a transient refocus that blurs again before the deferred check runs', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused),
      { initialProps: { isFocused: false } },
    );

    rerender({ isFocused: true });
    rerender({ isFocused: false });
    flushDismissalTimer();

    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
    expect(getSession(session.id)).toBeDefined();
  });

  it('does not dismiss when the session was already closed before the deferred check runs', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused),
      { initialProps: { isFocused: false } },
    );

    rerender({ isFocused: true });
    closeSession(session.id, { reason: 'completed' });
    flushDismissalTimer();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'completed' });
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
  });

  it('does not let a blur from one session close a different session', () => {
    const firstCallbacks = buildCallbacks();
    const firstSession = createSession(baseParams, firstCallbacks);
    const secondCallbacks = buildCallbacks();
    const secondSession = createSession(baseParams, secondCallbacks);

    const { rerender } = renderHook(
      ({
        headlessSessionId,
        isFocused,
      }: {
        headlessSessionId: string;
        isFocused: boolean;
      }) => useHeadlessSessionFocusDismissal(headlessSessionId, isFocused),
      {
        initialProps: {
          headlessSessionId: firstSession.id,
          isFocused: false,
        },
      },
    );

    rerender({
      headlessSessionId: secondSession.id,
      isFocused: true,
    });
    flushDismissalTimer();

    expect(firstCallbacks.onClose).not.toHaveBeenCalled();
    expect(secondCallbacks.onClose).not.toHaveBeenCalled();
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
    expect(getSession(firstSession.id)).toBeDefined();
    expect(getSession(secondSession.id)).toBeDefined();
  });

  it('does not convert a disabled focus transition into a user dismissal', () => {
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused, disabled }: { isFocused: boolean; disabled: boolean }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused, { disabled }),
      {
        initialProps: {
          isFocused: false,
          disabled: false,
        },
      },
    );

    rerender({ isFocused: true, disabled: true });
    flushDismissalTimer();

    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
    expect(getSession(session.id)).toBeDefined();
  });

  it('does not close on a suppressed (disabled) refocus even when the session blurred first', () => {
    // Mirrors the OtpCode success/empty-params path: the host blurs while a
    // native-flow screen is on top, then a programmatic navigate re-reveals it
    // with suppressFocusDismissal → disabled true. The regained focus must NOT
    // be read as a user dismissal.
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused, disabled }: { isFocused: boolean; disabled: boolean }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused, { disabled }),
      {
        initialProps: {
          isFocused: true,
          disabled: false,
        },
      },
    );

    // Blur while a native-flow screen is pushed (dismissal not yet suppressed).
    rerender({ isFocused: false, disabled: false });
    // Programmatic refocus arrives with suppression armed.
    rerender({ isFocused: true, disabled: true });
    flushDismissalTimer();

    expect(callbacks.onClose).not.toHaveBeenCalled();
    expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
    expect(getSession(session.id)).toBeDefined();
  });

  it('still detects a genuine back-out after a disabled refocus clears the blur marker', () => {
    // Hardening: the disabled branch resets the blur marker, so a disabled
    // refocus does not "arm" a later dismissal. A subsequent genuine
    // blur→refocus while enabled must produce its own user_dismissed close.
    const callbacks = buildCallbacks();
    const session = createSession(baseParams, callbacks);

    const { rerender } = renderHook(
      ({ isFocused, disabled }: { isFocused: boolean; disabled: boolean }) =>
        useHeadlessSessionFocusDismissal(session.id, isFocused, { disabled }),
      {
        initialProps: {
          isFocused: false,
          disabled: false,
        },
      },
    );

    // Disabled refocus: must clear the blur marker and not close.
    rerender({ isFocused: true, disabled: true });
    flushDismissalTimer();
    expect(callbacks.onClose).not.toHaveBeenCalled();

    // Now a genuine blur→refocus while enabled: should close this time.
    rerender({ isFocused: false, disabled: false });
    rerender({ isFocused: true, disabled: false });
    flushDismissalTimer();

    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledWith({
      reason: 'user_dismissed',
    });
    expect(mockDismissHeadlessFlow).toHaveBeenCalledTimes(1);
    expect(getSession(session.id)).toBeUndefined();
  });
});
