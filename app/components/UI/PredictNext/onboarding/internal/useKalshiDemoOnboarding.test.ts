import { AppState } from 'react-native';

import { KalshiOnboardingHttpError } from '../../adapters/remote/KalshiOnboardingClient';
import {
  createOnboardingController,
  type KalshiOnboardingApi,
} from './useKalshiDemoOnboarding';
import type { OnboardingEvent } from './kalshiDemoOnboardingMachine';

const flush = async () => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const statusOf = (state: string) =>
  ({ state }) as Awaited<ReturnType<KalshiOnboardingApi['getStatus']>>;

describe('createOnboardingController', () => {
  const events: OnboardingEvent[] = [];
  const keys: string[] = [];
  let client: jest.Mocked<KalshiOnboardingApi>;

  let clock = 0;

  const start = () => {
    const controller = createOnboardingController(
      () => ({
        client,
        walletAddress: '0x1234567890AbcdEF1234567890aBcdef12345678',
        network: 'base',
        pollIntervalMs: 0,
        onActivated: jest.fn(),
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
      verifyCode: jest.fn(async () => ({ verified: true as const })),
      runDemoKyc: jest.fn(async () => statusOf('approved')),
      activate: jest.fn(async () => ({ intentStatus: 'ACTIVATED' })),
    };
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
});
