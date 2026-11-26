import type { KalshiOnboardingStatus } from '../../contracts/v1/onboarding';
import type { AccountReadinessSnapshot } from '../accountReadiness.types';
import {
  createKalshiAccountReadinessAdapter,
  type KalshiAccountReadinessAdapter,
} from './createKalshiAccountReadinessAdapter';
import type { KalshiOnboardingApi } from './useKalshiDemoOnboarding';

const active: AccountReadinessSnapshot = {
  readiness: 'ready',
  card: { kind: 'verified' },
};
const pending: AccountReadinessSnapshot = {
  readiness: 'setup_required',
  card: { kind: 'finish_verifying', intent: 'resume' },
};
const restart: AccountReadinessSnapshot = {
  readiness: 'setup_required',
  card: {
    kind: 'action_required',
    reason: 'verification_failed',
    intent: 'restart',
  },
};

// ES2022 does not provide Promise.withResolvers.
function deferredStatus(): {
  promise: Promise<KalshiOnboardingStatus>;
  resolve: (value: KalshiOnboardingStatus) => void;
  reject: (reason: Error) => void;
} {
  let resolve!: (value: KalshiOnboardingStatus) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<KalshiOnboardingStatus>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(): {
  client: jest.Mocked<KalshiOnboardingApi>;
  openSetup: jest.Mock;
  adapter: KalshiAccountReadinessAdapter;
  invalidate: () => void;
} {
  const client: jest.Mocked<KalshiOnboardingApi> = {
    getStatus: jest.fn(),
    createIntent: jest.fn(),
    submitEmail: jest.fn(),
    verifyCode: jest.fn(),
    runDemoKyc: jest.fn(),
    activate: jest.fn(),
  };
  const openSetup = jest.fn();
  let current = true;
  const adapter = createKalshiAccountReadinessAdapter({
    client,
    openSetup,
    isCurrent: () => current,
  });
  return {
    client,
    openSetup,
    adapter,
    invalidate: (): void => {
      current = false;
    },
  };
}

describe('createKalshiAccountReadinessAdapter', () => {
  it('reads only status with the supplied signal and publishes the normalized projection', async () => {
    const { client, adapter } = setup();
    const listener = jest.fn();
    const signal = new AbortController().signal;
    client.getStatus.mockResolvedValue({
      state: 'kyc_pending',
      intentStatus: 'active',
    });
    adapter.subscribe(listener);

    const result = await adapter.readStatus({ signal });

    expect(result).toEqual(pending);
    expect(listener).toHaveBeenCalledWith(pending);
    expect(client.getStatus).toHaveBeenCalledWith({ signal });
    expect(client.createIntent).not.toHaveBeenCalled();
    expect(client.submitEmail).not.toHaveBeenCalled();
    expect(client.verifyCode).not.toHaveBeenCalled();
    expect(client.runDemoKyc).not.toHaveBeenCalled();
    expect(client.activate).not.toHaveBeenCalled();
  });

  it('stops delivering snapshots after unsubscribe', () => {
    const { adapter } = setup();
    const listener = jest.fn();
    const unsubscribe = adapter.subscribe(listener);

    adapter.publishStatus('active');
    unsubscribe();
    adapter.publishStatus('none');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(active);
  });

  it('serializes reentrant publications for every listener', () => {
    const { adapter } = setup();
    const events: string[] = [];
    adapter.subscribe((snapshot) => {
      events.push(`first:${snapshot.card.kind}`);
      if (snapshot.card.kind === 'finish_verifying')
        adapter.publishStatus('active');
    });
    adapter.subscribe((snapshot) =>
      events.push(`second:${snapshot.card.kind}`),
    );

    adapter.publishStatus('kyc_pending');

    expect(events).toEqual([
      'first:finish_verifying',
      'second:finish_verifying',
      'first:verified',
      'second:verified',
    ]);
  });

  it('publishes only sanitized classified restart failure and retains it through a pending read', async () => {
    const { adapter, client } = setup();
    const listener = jest.fn();
    adapter.subscribe(listener);
    adapter.publishStatus('kyc_pending');
    adapter.publishFailure({
      message: 'expired',
      next: 'email',
      report: 'secret',
      cooldownSec: 99,
    });
    client.getStatus.mockResolvedValue({ state: 'kyc_pending' });

    const result = await adapter.readStatus({
      signal: new AbortController().signal,
    });

    expect(result).toEqual(restart);
    expect(listener).toHaveBeenLastCalledWith(restart);
    expect(JSON.stringify(listener.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(listener.mock.calls)).not.toContain('cooldownSec');
  });

  it('does not replace restart evidence with transport or inline failures', () => {
    const { adapter } = setup();
    const listener = jest.fn();
    adapter.subscribe(listener);
    adapter.publishStatus('kyc_pending');
    adapter.publishFailure({ message: 'expired', next: 'email' });

    adapter.publishFailure({ message: 'generic', next: 'retry' });
    adapter.publishFailure({ message: 'code_incorrect', next: 'stay' });
    adapter.publishStatus('kyc_pending');

    expect(listener).toHaveBeenLastCalledWith(restart);
  });

  it.each(['active', 'approved', 'kyc_review'] as const)(
    'clears retained failure after authoritative progress to %s',
    (state) => {
      const { adapter } = setup();
      const listener = jest.fn();
      adapter.subscribe(listener);
      adapter.publishStatus('kyc_pending');
      adapter.publishFailure({ message: 'expired', next: 'email' });
      adapter.publishStatus(state);

      adapter.publishStatus('kyc_pending');

      expect(listener).toHaveBeenLastCalledWith(pending);
    },
  );

  it('propagates a current GET failure without fabricating a snapshot', async () => {
    const { adapter, client } = setup();
    const listener = jest.fn();
    const error = new Error('service unavailable');
    client.getStatus.mockRejectedValue(error);
    adapter.subscribe(listener);

    await expect(
      adapter.readStatus({ signal: new AbortController().signal }),
    ).rejects.toBe(error);
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects a response after its signal is aborted even if the client ignores cancellation', async () => {
    const { adapter, client } = setup();
    const read = deferredStatus();
    const controller = new AbortController();
    const listener = jest.fn();
    adapter.subscribe(listener);
    client.getStatus.mockReturnValue(read.promise);
    const result = adapter.readStatus({ signal: controller.signal });

    controller.abort();
    read.resolve({ state: 'active' });

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects an already aborted read without calling the client', async () => {
    const { adapter, client } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(
      adapter.readStatus({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(client.getStatus).not.toHaveBeenCalled();
  });

  it('rejects a stale read after a newer read publishes', async () => {
    const { adapter, client } = setup();
    const first = deferredStatus();
    const listener = jest.fn();
    adapter.subscribe(listener);
    client.getStatus
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ state: 'active' });
    const old = adapter.readStatus({ signal: new AbortController().signal });
    await adapter.readStatus({ signal: new AbortController().signal });

    first.resolve({ state: 'none' });

    await expect(old).rejects.toMatchObject({ name: 'AbortError' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(active);
  });

  it('rejects an older GET failure after a workflow observation', async () => {
    const { adapter, client } = setup();
    const read = deferredStatus();
    client.getStatus.mockReturnValue(read.promise);
    const result = adapter.readStatus({ signal: new AbortController().signal });
    adapter.publishStatus('active');

    read.reject(new Error('old transport error'));

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects a read superseded by classified workflow failure', async () => {
    const { adapter, client } = setup();
    const read = deferredStatus();
    const listener = jest.fn();
    adapter.subscribe(listener);
    client.getStatus.mockReturnValue(read.promise);
    const result = adapter.readStatus({ signal: new AbortController().signal });
    adapter.publishFailure({ message: 'expired', next: 'email' });

    read.resolve({ state: 'active' });

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(restart);
  });

  it.each(['identity replacement', 'disposal'] as const)(
    'suppresses a late response after %s',
    async (reason) => {
      const { adapter, client, invalidate } = setup();
      const read = deferredStatus();
      const listener = jest.fn();
      adapter.subscribe(listener);
      client.getStatus.mockReturnValue(read.promise);
      const result = adapter.readStatus({
        signal: new AbortController().signal,
      });
      if (reason === 'disposal') adapter.dispose();
      else invalidate();

      read.resolve({ state: 'active' });
      adapter.publishStatus('active');
      adapter.publishFailure({ message: 'expired', next: 'email' });
      adapter.openSetup('resume');

      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it('opens once until the gate resets the setup request', () => {
    const { adapter, openSetup } = setup();

    adapter.openSetup('resume');
    adapter.openSetup('restart');
    adapter.resetSetup();
    adapter.openSetup('retry');

    expect(openSetup.mock.calls).toEqual([['resume'], ['retry']]);
  });

  it('allows another open if the gate callback throws', () => {
    const { adapter, openSetup } = setup();
    openSetup.mockImplementationOnce(() => {
      throw new Error('failed');
    });

    expect(() => adapter.openSetup('resume')).toThrow('failed');
    adapter.openSetup('restart');

    expect(openSetup).toHaveBeenLastCalledWith('restart');
  });

  it('invalidates an in-flight passive read when setup opens', async () => {
    const { adapter, client } = setup();
    const read = deferredStatus();
    client.getStatus.mockReturnValue(read.promise);
    const result = adapter.readStatus({ signal: new AbortController().signal });

    adapter.openSetup('resume');
    read.resolve({ state: 'none' });

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
