import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { KalshiOnboardingHttpError } from '../../adapters/remote/KalshiOnboardingClient';
import type {
  KalshiOnboardingStatus,
  KalshiOnboardingState,
} from '../../contracts/v1/onboarding';
import {
  useKalshiActivation,
  type KalshiActivationApi,
  type UseKalshiActivationOptions,
} from './useKalshiActivation';

const WALLET = '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c';

const statusOf = (state: KalshiOnboardingState): KalshiOnboardingStatus => ({
  state,
});

const build = (overrides: Partial<UseKalshiActivationOptions> = {}) => {
  const client: KalshiActivationApi = {
    getStatus: jest.fn(async () => statusOf('approved')),
    activate: jest.fn(async () => ({}) as never),
  };
  const onActivated = jest.fn();
  let keys = 0;
  const newKey = jest.fn(() => `key-${keys++}`);
  let clock = 0;
  const hook = renderHook(() =>
    useKalshiActivation({
      client,
      enabled: true,
      walletAddress: WALLET,
      network: 'base',
      pollIntervalMs: 0,
      canPoll: () => true,
      onActivated,
      now: () => {
        clock += 1_000;
        return clock;
      },
      newKey,
      ...overrides,
    }),
  );
  return { ...hook, client, onActivated, newKey };
};

const flush = async () => {
  await act(async () => {
    await jest.runAllTimersAsync();
  });
};

describe('useKalshiActivation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AppState.currentState = 'active';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['approved', true],
    ['active', false],
    ['none', false],
  ] as const)('requires activation for %s: %s', async (status, expected) => {
    const { result, client } = build();
    (client.getStatus as jest.Mock).mockResolvedValue(statusOf(status));
    expect(result.current.requiresActivation).toBe(false);

    act(() => result.current.refresh());
    await flush();

    expect(result.current.status).toBe(status);
    expect(result.current.requiresActivation).toBe(expected);
  });

  it('does not read status or activate when disabled', async () => {
    const { result, client } = build({ enabled: false });

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());

    expect(client.getStatus).not.toHaveBeenCalled();
    expect(client.activate).not.toHaveBeenCalled();
    expect(result.current.requiresActivation).toBe(false);
  });

  it('registers the wallet, polls until active, and notifies once', async () => {
    const { result, client, onActivated, newKey } = build();
    (client.getStatus as jest.Mock)
      .mockResolvedValueOnce(statusOf('approved'))
      .mockResolvedValueOnce(statusOf('approved'))
      .mockResolvedValueOnce(statusOf('active'));

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(client.activate).toHaveBeenCalledWith(WALLET, 'base', 'key-0');
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(newKey).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
    expect(result.current.status).toBe('active');
    expect(result.current.requiresActivation).toBe(false);
    expect(result.current.completed).toBe(true);
  });

  it('keeps the idempotency key when the register fails', async () => {
    const { result, client } = build();
    (client.activate as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({});
    (client.getStatus as jest.Mock)
      .mockResolvedValueOnce(statusOf('approved'))
      .mockResolvedValueOnce(statusOf('active'));

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(result.current.failure?.action).toBe('activate');
    expect(result.current.requiresActivation).toBe(true);

    act(() => result.current.activate());
    await flush();

    expect(client.activate).toHaveBeenNthCalledWith(1, WALLET, 'base', 'key-0');
    expect(client.activate).toHaveBeenNthCalledWith(2, WALLET, 'base', 'key-0');
    expect(result.current.requiresActivation).toBe(false);
  });

  it('offers a status re-read, not a second register, when polling times out', async () => {
    const { result, client, onActivated } = build();
    let clock = 0;
    // Each read burns the whole budget so the poll exits after one attempt.
    (client.getStatus as jest.Mock).mockImplementation(async () => {
      clock += 120_000;
      return statusOf('approved');
    });

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(result.current.failure).toEqual({
      message: 'activation_timeout',
      action: 'checkAgain',
      cooldownSec: undefined,
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.completed).toBe(false);
    expect(result.current.registerAccepted).toBe(true);
    expect(onActivated).not.toHaveBeenCalled();

    act(() => result.current.checkAgain());
    await flush();

    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(result.current.failure?.action).toBe('checkAgain');
  });

  it('keeps the accepted register after dismiss so the next attempt only re-reads', async () => {
    const { result, client } = build();
    let clock = 0;
    (client.getStatus as jest.Mock).mockImplementation(async () => {
      clock += 120_000;
      return statusOf('approved');
    });

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();
    expect(result.current.registerAccepted).toBe(true);
    expect(result.current.failure?.action).toBe('checkAgain');

    act(() => result.current.dismiss());
    act(() => result.current.refresh());
    await flush();

    expect(result.current.registerAccepted).toBe(true);
    expect(result.current.requiresActivation).toBe(true);
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('keeps the last status and the retry when a read fails', async () => {
    const { result, client } = build();
    act(() => result.current.refresh());
    await flush();
    expect(result.current.status).toBe('approved');

    (client.getStatus as jest.Mock).mockRejectedValue(new Error('offline'));
    act(() => result.current.refresh());
    await flush();
    expect(result.current.status).toBe('approved');
    expect(result.current.requiresActivation).toBe(true);

    act(() => result.current.checkAgain());
    await flush();

    expect(result.current.failure).toEqual({
      message: 'generic',
      action: 'checkAgain',
      cooldownSec: undefined,
    });
    expect(result.current.status).toBe('approved');
    expect(result.current.requiresActivation).toBe(true);
  });

  it('closes the prompt when a status re-read finds the account active', async () => {
    const { result, client, onActivated } = build();
    let clock = 0;
    (client.getStatus as jest.Mock).mockImplementation(async () => {
      clock += 120_000;
      return statusOf('approved');
    });

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();
    (client.getStatus as jest.Mock).mockResolvedValue(statusOf('active'));

    act(() => result.current.checkAgain());
    await flush();

    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(result.current.requiresActivation).toBe(false);
  });

  it.each([
    ['onboarding_not_ready', 'generic', 'checkAgain'],
    ['onboarding_signup_incomplete', 'signup_incomplete', 'none'],
  ] as const)('maps the %s failure to %s', async (code, message, action) => {
    const { result, client } = build();
    (client.activate as jest.Mock).mockRejectedValueOnce(
      new KalshiOnboardingHttpError(409, code),
    );

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(result.current.failure).toEqual({
      message,
      action,
      cooldownSec: undefined,
    });
  });

  it('stops polling when the sheet is dismissed mid-wait', async () => {
    const { result, client } = build();
    act(() => result.current.refresh());
    await flush();

    act(() => result.current.activate());
    await act(async () => undefined);
    act(() => result.current.dismiss());
    await flush();

    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(result.current.failure).toBeUndefined();
    expect(result.current.registerAccepted).toBe(true);
  });

  it('skips polls without connectivity', async () => {
    let online = true;
    const { result, client } = build({ canPoll: () => online });
    act(() => result.current.refresh());
    await flush();

    act(() => result.current.activate());
    online = false;
    await flush();

    expect(result.current.failure?.message).toBe('activation_timeout');
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(client.getStatus).toHaveBeenCalledTimes(1);
  });

  it('skips polls while the app is backgrounded', async () => {
    const { result, client } = build();
    act(() => result.current.refresh());
    await flush();

    act(() => result.current.activate());
    AppState.currentState = 'background';
    await flush();

    expect(result.current.failure?.message).toBe('activation_timeout');
    expect(client.getStatus).toHaveBeenCalledTimes(1);
  });

  it('does not activate without connectivity', async () => {
    const { result, client } = build({ canPoll: () => false });
    act(() => result.current.refresh());
    await flush();

    act(() => result.current.activate());

    expect(client.activate).not.toHaveBeenCalled();
    expect(result.current.failure).toEqual({
      message: 'generic',
      action: 'activate',
      cooldownSec: undefined,
    });
  });

  it('fails when the poll reports a state the venue owns', async () => {
    const { result, client } = build();
    (client.getStatus as jest.Mock)
      .mockResolvedValueOnce(statusOf('approved'))
      .mockResolvedValueOnce(statusOf('unsupported'));

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(result.current.failure).toEqual({
      message: 'unsupported',
      action: 'checkAgain',
      cooldownSec: undefined,
    });
    expect(result.current.registerAccepted).toBe(true);
  });

  it('fails with a retry when a poll read throws', async () => {
    const { result, client } = build();
    (client.getStatus as jest.Mock)
      .mockResolvedValueOnce(statusOf('approved'))
      .mockRejectedValueOnce(new Error('offline'));

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    await flush();

    expect(result.current.failure).toEqual({
      message: 'generic',
      action: 'checkAgain',
      cooldownSec: undefined,
    });
    expect(result.current.busy).toBe(false);
  });

  it('shares one in-flight status read', async () => {
    const { result, client } = build();
    let resolveRead!: (status: KalshiOnboardingStatus) => void;
    (client.getStatus as jest.Mock).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    act(() => result.current.refresh());
    act(() => result.current.checkAgain());
    expect(client.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRead(statusOf('approved'));
      await Promise.resolve();
    });

    expect(result.current.status).toBe('approved');
    expect(result.current.failure?.action).toBe('checkAgain');
  });

  it('drops a status read that finishes after dismissal', async () => {
    const { result, client } = build();
    let resolveRead!: (status: KalshiOnboardingStatus) => void;
    (client.getStatus as jest.Mock).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    act(() => result.current.refresh());
    act(() => result.current.dismiss());
    await act(async () => {
      resolveRead(statusOf('active'));
      await Promise.resolve();
    });

    expect(result.current.status).toBeUndefined();
  });

  it('drops a failed status read that settles after dismissal', async () => {
    const { result, client } = build();
    let rejectRead!: (error: unknown) => void;
    (client.getStatus as jest.Mock).mockImplementation(
      async () =>
        new Promise((_resolve, reject) => {
          rejectRead = reject;
        }),
    );

    act(() => result.current.refresh());
    act(() => result.current.dismiss());
    await act(async () => {
      rejectRead(new Error('offline'));
      await Promise.resolve();
    });

    expect(result.current.status).toBeUndefined();
  });

  it('drops a check that finishes after dismissal', async () => {
    const { result, client } = build();
    act(() => result.current.refresh());
    await flush();

    let resolveRead!: (status: KalshiOnboardingStatus) => void;
    (client.getStatus as jest.Mock).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );

    act(() => result.current.checkAgain());
    act(() => result.current.dismiss());
    await act(async () => {
      resolveRead(statusOf('active'));
      await Promise.resolve();
    });

    expect(result.current.completed).toBe(false);
  });

  it('ignores refresh and re-read while a register is in flight', async () => {
    const { result, client } = build();
    (client.activate as jest.Mock).mockImplementation(
      async () => new Promise(() => undefined),
    );

    act(() => result.current.activate());
    act(() => result.current.refresh());
    act(() => result.current.checkAgain());

    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(client.getStatus).not.toHaveBeenCalled();
  });

  it('drops a register that fails after dismissal', async () => {
    const { result, client } = build();
    let rejectActivate!: (error: unknown) => void;
    (client.activate as jest.Mock).mockImplementation(
      async () =>
        new Promise((_resolve, reject) => {
          rejectActivate = reject;
        }),
    );

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    act(() => result.current.dismiss());
    await act(async () => {
      rejectActivate(new Error('boom'));
      await Promise.resolve();
    });

    expect(result.current.failure).toBeUndefined();
  });

  it('drops a register that resolves after dismissal', async () => {
    const { result, client } = build();
    let resolveActivate!: (value: unknown) => void;
    (client.activate as jest.Mock).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveActivate = resolve;
        }),
    );

    act(() => result.current.refresh());
    await flush();
    act(() => result.current.activate());
    act(() => result.current.dismiss());
    await act(async () => {
      resolveActivate({});
      await Promise.resolve();
    });

    expect(result.current.registerAccepted).toBe(false);
    expect(result.current.failure).toBeUndefined();
  });
});
