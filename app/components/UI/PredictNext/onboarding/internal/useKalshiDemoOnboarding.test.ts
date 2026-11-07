import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import Logger from '../../../../../util/Logger';
import {
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from '../../adapters/remote/KalshiOnboardingClient';
import type { KalshiLinkVerify } from '../../contracts/v1/onboarding';
import {
  createOnboardingController,
  useKalshiDemoOnboarding,
  type KalshiOnboardingApi,
} from './useKalshiDemoOnboarding';
import type { OnboardingEvent } from './kalshiDemoOnboardingMachine';

const flush = async () => {
  await jest.runAllTimersAsync();
};

const WALLET = '0x1234567890AbcdEF1234567890aBcdef12345678';

const statusOf = (state: string) =>
  ({ state }) as Awaited<ReturnType<KalshiOnboardingApi['getStatus']>>;

describe('createOnboardingController', () => {
  const events: OnboardingEvent[] = [];
  const keys: string[] = [];
  let client: jest.Mocked<KalshiOnboardingApi>;
  let onActivated: jest.Mock;
  let clock = 0;

  const start = (
    overrides: {
      omitWallet?: boolean;
      canPoll?: () => boolean;
      pollIntervalMs?: number;
    } = {},
  ) => {
    onActivated = jest.fn();
    const controller = createOnboardingController(
      () => ({
        client,
        ...(overrides.omitWallet ? {} : { walletAddress: WALLET }),
        network: 'base',
        pollIntervalMs: overrides.pollIntervalMs ?? 0,
        canPoll: overrides.canPoll,
        onActivated,
        newKey: () => {
          const key = `key-${keys.length + 1}`;
          keys.push(key);
          return key;
        },
        now: () => {
          clock += 10_000;
          return clock;
        },
      }),
      (event) => {
        events.push(event);
      },
    );
    return controller;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    events.length = 0;
    clock = 0;
    keys.length = 0;
    AppState.currentState = 'active';
    client = {
      getStatus: jest.fn(async () => statusOf('none')),
      createIntent: jest.fn(async () => ({
        intentStatus: 'CREATED',
        supersededPrevious: false,
      })),
      submitEmail: jest.fn(async () => undefined),
      verifyCode: jest.fn(
        async (): Promise<KalshiLinkVerify> => ({ verified: true }),
      ),
      runDemoKyc: jest.fn(async () => statusOf('approved')),
      activate: jest.fn(async () => ({ intentStatus: 'ACTIVATED' })),
    } as unknown as jest.Mocked<KalshiOnboardingApi>;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses the intent and link keys when the same email action is retried', async () => {
    client.submitEmail
      .mockRejectedValueOnce(
        new KalshiOnboardingHttpError(503, 'onboarding_unavailable'),
      )
      .mockResolvedValueOnce(undefined);
    const controller = start();

    controller.submitEmail(' User@Example.com ');
    await flush();
    controller.retry();
    await flush();

    expect(client.createIntent).toHaveBeenNthCalledWith(1, 'key-1');
    expect(client.createIntent).toHaveBeenNthCalledWith(2, 'key-1');
    expect(client.submitEmail).toHaveBeenNthCalledWith(
      1,
      'User@Example.com',
      'key-2',
    );
    expect(client.submitEmail).toHaveBeenNthCalledWith(
      2,
      'User@Example.com',
      'key-2',
    );
  });

  it('mints new keys for a new email action', async () => {
    const controller = start();

    controller.submitEmail('a@example.com');
    await flush();
    controller.submitEmail('b@example.com');
    await flush();

    expect(client.createIntent.mock.calls.map((call) => call[0])).toEqual([
      'key-1',
      'key-3',
    ]);
  });

  it('runs demo KYC and then polls until the intent leaves review', async () => {
    client.getStatus
      .mockResolvedValueOnce(statusOf('kyc_pending'))
      .mockResolvedValueOnce(statusOf('approved'));
    client.runDemoKyc.mockResolvedValueOnce(statusOf('kyc_pending'));
    const controller = start();

    controller.start();
    await flush();

    expect(client.runDemoKyc).toHaveBeenCalledTimes(1);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toMatchObject({ type: 'status', state: 'approved' });
  });

  it('drops the typed email on dismiss', async () => {
    const controller = start();
    controller.submitEmail('a@example.com');
    await flush();

    controller.dismiss();
    controller.resendCode();
    await flush();

    expect(client.submitEmail).toHaveBeenCalledTimes(1);
  });

  it('re-reads status after verify until Kalshi leaves link_pending', async () => {
    client.getStatus
      .mockResolvedValueOnce(statusOf('link_pending'))
      .mockResolvedValueOnce(statusOf('link_pending'))
      .mockResolvedValueOnce(statusOf('approved'));
    const controller = start();

    controller.verifyCode('123456');
    await flush();

    expect(client.getStatus).toHaveBeenCalledTimes(3);
    expect(events.map((e) => e.type)).toContain('verifying');
    expect(events.filter((e) => e.type === 'status')).toEqual([
      { type: 'status', state: 'approved', initial: false },
    ]);
  });

  it('times out when link_pending outlasts the verify poll budget', async () => {
    client.getStatus.mockResolvedValue(statusOf('link_pending'));
    const controller = start();

    controller.verifyCode('123456');
    await flush();

    expect(events.at(-1)).toEqual({ type: 'review_timed_out' });
  });

  it('asks for the second factor and verifies it on the same route', async () => {
    client.verifyCode
      .mockResolvedValueOnce({
        verified: false,
        mfa: { method: 'sms', phoneLast4: '8564' },
      })
      .mockResolvedValueOnce({ verified: true });
    client.getStatus.mockResolvedValue(statusOf('approved'));
    const controller = start();

    controller.verifyCode('111111');
    await flush();

    expect(events).toContainEqual({
      type: 'mfa_required',
      mfa: { method: 'sms', phoneLast4: '8564' },
    });
    // The first code did not link anything, so status is not read yet.
    expect(client.getStatus).not.toHaveBeenCalled();
    expect(events.map((e) => e.type)).not.toContain('verifying');

    controller.verifyCode('222222');
    await flush();

    expect(client.verifyCode).toHaveBeenNthCalledWith(1, '111111', 'key-1');
    expect(client.verifyCode).toHaveBeenNthCalledWith(2, '222222', 'key-2');
    expect(events.map((e) => e.type)).toContain('verifying');
    expect(events.filter((e) => e.type === 'status').at(-1)).toEqual({
      type: 'status',
      state: 'approved',
      initial: false,
    });
  });

  it('calls onActivated when demo KYC returns active', async () => {
    client.getStatus.mockResolvedValueOnce(statusOf('kyc_pending'));
    client.runDemoKyc.mockResolvedValueOnce(statusOf('active'));
    const controller = start();

    controller.start();
    await flush();

    expect(client.getStatus).toHaveBeenCalledTimes(1);
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('polls when demo KYC stays in review', async () => {
    client.getStatus
      .mockResolvedValueOnce(statusOf('kyc_pending'))
      .mockResolvedValueOnce(statusOf('approved'));
    client.runDemoKyc.mockResolvedValueOnce(statusOf('kyc_review'));
    const controller = start();

    controller.start();
    await flush();

    expect(events.at(-1)).toMatchObject({ type: 'status', state: 'approved' });
  });

  it('does not call onActivated when the profile is already active', async () => {
    client.getStatus.mockResolvedValueOnce(statusOf('active'));
    const controller = start();

    controller.start();
    await flush();

    expect(onActivated).not.toHaveBeenCalled();
    expect(events).toContainEqual({
      type: 'status',
      state: 'active',
      initial: true,
    });
  });

  it('polls a review without running demo KYC', async () => {
    client.getStatus
      .mockResolvedValueOnce(statusOf('kyc_review'))
      .mockResolvedValueOnce(statusOf('approved'));
    const controller = start({ canPoll: () => true });

    controller.start();
    await flush();

    expect(client.runDemoKyc).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ type: 'status', state: 'approved' });
  });

  it('fails the poll when the device has no usable network', async () => {
    client.getStatus.mockResolvedValue(statusOf('kyc_review'));
    const controller = start({ canPoll: () => false });

    controller.start();
    await flush();

    expect(client.getStatus).toHaveBeenCalledTimes(1);
    expect(events.at(-1)).toMatchObject({
      type: 'failed',
      failure: { message: 'generic', next: 'retry' },
    });
  });

  it('skips a poll read while the app is backgrounded', async () => {
    AppState.currentState = 'background';
    client.getStatus
      .mockResolvedValueOnce(statusOf('kyc_review'))
      .mockResolvedValueOnce(statusOf('approved'));
    const controller = start({ pollIntervalMs: 1_000 });

    controller.start();
    await jest.advanceTimersByTimeAsync(1_000);

    expect(client.getStatus).toHaveBeenCalledTimes(1);

    AppState.currentState = 'active';
    await jest.advanceTimersByTimeAsync(1_000);

    expect(client.getStatus).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toMatchObject({ type: 'status', state: 'approved' });
  });

  it('resends the code for the email already submitted', async () => {
    const controller = start();

    controller.submitEmail('a@example.com');
    await flush();
    controller.resendCode();
    await flush();

    expect(client.createIntent).toHaveBeenCalledTimes(1);
    expect(client.submitEmail).toHaveBeenNthCalledWith(
      2,
      'a@example.com',
      'key-3',
    );
  });

  it('leaves the wallet unchanged when activate has no address', async () => {
    const controller = start({ omitWallet: true });

    controller.activate();
    await flush();

    expect(client.activate).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('registers the wallet and calls onActivated when status becomes active', async () => {
    client.getStatus.mockResolvedValueOnce(statusOf('active'));
    const controller = start();

    controller.activate();
    await flush();

    expect(client.activate).toHaveBeenCalledWith(WALLET, 'base', 'key-1');
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it('ignores a status that arrives after dismiss', async () => {
    let resolveStatus: (status: ReturnType<typeof statusOf>) => void = () =>
      undefined;
    client.getStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const controller = start();

    controller.start();
    controller.dismiss();
    resolveStatus(statusOf('approved'));
    await flush();

    expect(events.map((event) => event.type)).toEqual([
      'started',
      'busy',
      'dismissed',
    ]);
  });

  it('drops a failure from an action dismissed while in flight', async () => {
    let rejectStatus: (error: Error) => void = () => undefined;
    client.getStatus.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectStatus = reject;
      }),
    );
    const controller = start();

    controller.start();
    controller.dismiss();
    rejectStatus(new Error('late'));
    await flush();

    expect(events.map((event) => event.type)).not.toContain('failed');
  });

  it('reports a policy failure by rule', async () => {
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    client.createIntent.mockRejectedValueOnce(
      new KalshiOnboardingPolicyError('signing_unavailable'),
    );
    const controller = start();

    controller.submitEmail('a@example.com');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Kalshi demo onboarding failed: policy:signing_unavailable',
      }),
      'PredictNext: Kalshi demo onboarding failed',
    );
    errorSpy.mockRestore();
  });

  it('reads status on retry after a failure that restarts the email step', async () => {
    client.createIntent.mockRejectedValueOnce(
      new KalshiOnboardingHttpError(409, 'onboarding_intent_missing'),
    );
    client.getStatus.mockResolvedValueOnce(statusOf('none'));
    const controller = start();

    controller.submitEmail('a@example.com');
    await flush();
    controller.retry();
    await flush();

    expect(client.createIntent).toHaveBeenCalledTimes(1);
    expect(client.getStatus).toHaveBeenCalledTimes(1);
  });

  it('reads status on retry when the failure asks for a fresh status', async () => {
    client.submitEmail.mockRejectedValueOnce(
      new KalshiOnboardingHttpError(409, 'onboarding_not_ready'),
    );
    client.getStatus.mockResolvedValueOnce(statusOf('link_pending'));
    const controller = start();

    controller.submitEmail('a@example.com');
    await flush();
    controller.retry();
    await flush();

    expect(client.submitEmail).toHaveBeenCalledTimes(1);
    expect(client.getStatus).toHaveBeenCalledTimes(1);
  });

  it('reads status when verify is unverified and names no second factor', async () => {
    client.verifyCode.mockResolvedValueOnce({ verified: false });
    client.getStatus.mockResolvedValueOnce(statusOf('approved'));
    const controller = start();

    controller.verifyCode('123456');
    await flush();

    expect(events.map((event) => event.type)).toContain('verifying');
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: 'mfa_required' }),
    );
  });

  it('clears a pending poll when dismissed', async () => {
    client.getStatus.mockResolvedValue(statusOf('kyc_review'));
    const controller = start({ pollIntervalMs: 5_000 });

    controller.start();
    await jest.advanceTimersByTimeAsync(0);
    controller.dismiss();
    await flush();

    expect(events.at(-1)).toEqual({ type: 'dismissed' });
    expect(events.map((event) => event.type)).not.toContain('review_timed_out');
  });

  it('reads status on mount and stops on unmount', async () => {
    client.getStatus.mockResolvedValue(statusOf('none'));
    const view = renderHook(() =>
      useKalshiDemoOnboarding({
        client,
        network: 'base',
        pollIntervalMs: 1_000,
        onActivated: jest.fn(),
      }),
    );

    await act(async () => {
      await flush();
    });

    expect(view.result.current.state.step).toBe('email');

    view.unmount();
  });
});
