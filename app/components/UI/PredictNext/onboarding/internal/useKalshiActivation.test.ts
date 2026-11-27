import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

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
    expect(onActivated).not.toHaveBeenCalled();

    act(() => result.current.checkAgain());
    await flush();

    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(result.current.failure?.action).toBe('checkAgain');
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
});
