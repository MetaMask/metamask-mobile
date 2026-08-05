import {
  MoneyAccountUpgradeStepError,
  TerminalUpgradeError,
} from '@metamask/money-account-upgrade-controller';
import {
  __resetUpgradesInFlightForTesting,
  upgradeMoneyAccount,
} from './index';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';
import type { RootState } from '../../reducers';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountUpgradeController: {
        upgradeAccount: jest.fn(),
        state: { upgradedAccounts: {} },
      },
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../core/Engine/controllers/money-account-upgrade-controller-init',
  () => ({
    whenMoneyAccountUpgradeReady: jest.fn(() => Promise.resolve()),
  }),
);

const mockUpgradeAccount = Engine.context.MoneyAccountUpgradeController
  .upgradeAccount as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockLogError = Logger.error as jest.Mock;
const mockLogLog = Logger.log as jest.Mock;
const mockWhenReady = whenMoneyAccountUpgradeReady as jest.Mock;

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as const;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A step failure the retry wrapper considers retryable. In these tests it is
 * always paired with a signal that aborts before or during the backoff wait,
 * so the wrapper gives up promptly instead of sitting out a (real-timer)
 * retry delay.
 */
const retryableStepError = () =>
  new MoneyAccountUpgradeStepError('associate-address', new Error('http 500'));

describe('upgradeMoneyAccount', () => {
  let dispatch: jest.Mock;
  let getState: jest.Mock<RootState>;

  /**
   * Dispatches the thunk under test. The thunk requires a signal, so tests
   * that don't exercise aborting get a fresh, never-aborted one.
   */
  const dispatchUpgrade = (
    signal: AbortSignal = new AbortController().signal,
  ) => upgradeMoneyAccount(signal)(dispatch, getState, undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    __resetUpgradesInFlightForTesting();
    dispatch = jest.fn();
    getState = jest.fn().mockReturnValue({} as RootState);
    mockUpgradeAccount.mockResolvedValue(undefined);
    Engine.context.MoneyAccountUpgradeController.state = {
      upgradedAccounts: {},
    };
  });

  it('calls MoneyAccountUpgradeController.upgradeAccount with the primary money account address', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });

  it('logs the start of an upgrade, noting the account was not previously recorded', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'starting upgrade',
      { address: ADDRESS, recordedBefore: false },
    );
  });

  it('logs the start of an upgrade, noting the account was previously recorded', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    Engine.context.MoneyAccountUpgradeController.state = {
      upgradedAccounts: {
        [ADDRESS]: { configFingerprint: 'fingerprint', completedAt: 1 },
      },
    };

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'starting upgrade',
      { address: ADDRESS, recordedBefore: true },
    );
  });

  it('logs success with the duration and the recorded upgrade status', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const recorded = { configFingerprint: 'fingerprint', completedAt: 123 };
    mockUpgradeAccount.mockImplementationOnce(async () => {
      Engine.context.MoneyAccountUpgradeController.state = {
        upgradedAccounts: { [ADDRESS]: recorded },
      };
    });

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade succeeded',
      expect.objectContaining({
        address: ADDRESS,
        recordedBefore: false,
        durationMs: expect.any(Number),
        recorded,
      }),
    );
  });

  it('reports the failure and does not log success when the upgrade fails', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockRejectedValueOnce(new Error('boom'));

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
      }),
    );
    expect(mockLogLog).not.toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade succeeded',
      expect.anything(),
    );
  });

  it('reports a genuine failure that lands after the signal has aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockImplementationOnce(() => {
      abortController.abort();
      return Promise.reject(new Error('terminal boom'));
    });

    dispatchUpgrade(abortController.signal);
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'terminal boom' }),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
      }),
    );
  });

  it('skips the attempt and logs quietly when the signal is already aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    abortController.abort();

    dispatchUpgrade(abortController.signal);
    await flushPromises();

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade aborted; skipping',
      { address: ADDRESS },
    );
  });

  it('does not interrupt an in-flight attempt when the signal aborts, and still records its success', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    let resolveAttempt: () => void = () => undefined;
    mockUpgradeAccount.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveAttempt = resolve;
        }),
    );

    dispatchUpgrade(abortController.signal);
    await flushPromises();
    // The screen blurs while the attempt is still running…
    abortController.abort();
    // …and the attempt later completes successfully.
    resolveAttempt();
    await flushPromises();

    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade succeeded',
      expect.objectContaining({ address: ADDRESS }),
    );
  });

  it('reports the retryable failure but logs the abort itself quietly when the failure lands after the signal aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockImplementationOnce(() => {
      abortController.abort();
      return Promise.reject(retryableStepError());
    });

    dispatchUpgrade(abortController.signal);
    await flushPromises();

    // The attempt's failure reaches Sentry once (via the retry report); the
    // abort that ends the run is not itself an error.
    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'MoneyAccountUpgradeStepError' }),
      expect.anything(),
    );
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade aborted; skipping',
      { address: ADDRESS },
    );
  });

  it('reports a retried failure to Sentry with the attempt number and step tag', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockRejectedValueOnce(retryableStepError());

    dispatchUpgrade(abortController.signal);
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'MoneyAccountUpgradeStepError' }),
      {
        tags: {
          feature: 'money-account-upgrade',
          step: 'associate-address',
        },
        context: {
          name: 'money_account_upgrade',
          data: {
            phase: 'upgrade',
            step: 'associate-address',
            attempt: 1,
            willRetry: true,
          },
        },
      },
    );

    // End the pending backoff wait so its timer does not leak out of the test.
    abortController.abort();
    await flushPromises();
  });

  it('stops reporting retried failures to Sentry after the per-run cap', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    try {
      mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
      const abortController = new AbortController();
      mockUpgradeAccount.mockRejectedValue(retryableStepError());

      dispatchUpgrade(abortController.signal);
      await flushPromises();

      // Attempts 2–4 fire after backoff waits of 10s, 20s, and 40s.
      await jest.advanceTimersByTimeAsync(10_000);
      await jest.advanceTimersByTimeAsync(20_000);
      await jest.advanceTimersByTimeAsync(40_000);

      // Four attempts have failed, but only the first three reach Sentry;
      // the last reported one flags that later reports are suppressed.
      const retryReports = mockLogError.mock.calls.filter(
        ([, options]) => options?.context?.data?.willRetry,
      );
      expect(retryReports).toHaveLength(3);
      expect(retryReports[2][1].context.data).toMatchObject({
        attempt: 3,
        furtherRetryReportsSuppressed: true,
      });
      // The fourth failure is still logged locally.
      expect(mockLogLog).toHaveBeenCalledWith(
        expect.stringContaining('upgradeMoneyAccount'),
        'attempt failed; will retry',
        { address: ADDRESS, attempt: 4 },
      );

      // End the pending backoff wait so its timer does not leak out of the
      // test.
      abortController.abort();
      await flushPromises();
    } finally {
      jest.useRealTimers();
    }
  });

  it('allows a new upgrade after an aborted one settles', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockImplementationOnce(() => {
      abortController.abort();
      return Promise.reject(retryableStepError());
    });

    dispatchUpgrade(abortController.signal);
    await flushPromises();
    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('skips the call and logs when there is no primary money account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

    dispatchUpgrade();

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalled();
  });

  it('skips the call when the primary money account address is not a strict hex string', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: 'not-hex' });

    dispatchUpgrade();

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      expect.stringContaining('no valid primary money account'),
      expect.objectContaining({ address: 'not-hex' }),
    );
  });

  it('catches rejected upgradeAccount promises and reports to Sentry with a feature tag', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const error = new Error('boom');
    mockUpgradeAccount.mockRejectedValueOnce(error);

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
      }),
    );
  });

  it('tags the failing step and preserves the underlying cause message for Sentry', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    // `MoneyAccountUpgradeStepError.message` embeds the underlying step error's
    // message, which is what `Logger.error` forwards to Sentry's
    // `captureException`. Asserting on it guards against the thunk dropping the
    // original message (e.g. by re-wrapping in a generic Error). The cause is
    // terminal so the retry wrapper rethrows it immediately.
    const causeMessage = 'account is delegated to a third-party implementation';
    const error = new MoneyAccountUpgradeStepError(
      'eip-7702-authorization',
      new TerminalUpgradeError(causeMessage),
    );
    mockUpgradeAccount.mockRejectedValueOnce(error);

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(causeMessage),
      }),
      expect.objectContaining({
        tags: {
          feature: 'money-account-upgrade',
          step: 'eip-7702-authorization',
        },
        context: {
          name: 'money_account_upgrade',
          data: { phase: 'upgrade', step: 'eip-7702-authorization' },
        },
      }),
    );
    // The error is forwarded unchanged (not re-wrapped), so its identity and
    // step survive too.
    expect(mockLogError.mock.calls[0][0]).toBe(error);
  });

  it('wraps non-Error rejections', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockRejectedValueOnce('string rejection');

    dispatchUpgrade();
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
      }),
    );
  });

  it('skips quietly (no Sentry error) when the controller is not ready', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockWhenReady.mockRejectedValueOnce(new Error('bootstrap not scheduled'));

    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade controller not ready; skipping',
      expect.objectContaining({ address: ADDRESS }),
    );
  });

  it('deduplicates concurrent upgrades for the same address', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockReturnValueOnce(new Promise(() => undefined));

    dispatchUpgrade();
    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade already in flight; queued takeover',
      { address: ADDRESS },
    );
  });

  it('restarts a shadowed upgrade under the takeover signal when the first run is aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const first = new AbortController();
    const second = new AbortController();
    let rejectFirst: (error: Error) => void = () => undefined;
    mockUpgradeAccount.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );

    dispatchUpgrade(first.signal);
    await flushPromises();
    // A second screen focuses while the first run is still in flight.
    dispatchUpgrade(second.signal);
    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);

    // The first screen blurs: its run aborts and unwinds.
    first.abort();
    rejectFirst(retryableStepError());
    await flushPromises();

    // The restart runs under the (non-aborted) takeover signal; had it reused
    // the first, aborted signal, the retry wrapper would give up before
    // calling the controller again.
    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(2, ADDRESS);
  });

  it('does not restart when the takeover signal is already aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const first = new AbortController();
    const second = new AbortController();
    let rejectFirst: (error: Error) => void = () => undefined;
    mockUpgradeAccount.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );

    dispatchUpgrade(first.signal);
    await flushPromises();
    dispatchUpgrade(second.signal);

    second.abort();
    first.abort();
    rejectFirst(retryableStepError());
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('does not restart under the takeover signal when the aborted run ends with a terminal failure', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const first = new AbortController();
    const second = new AbortController();
    let rejectFirst: (error: Error) => void = () => undefined;
    mockUpgradeAccount.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );

    dispatchUpgrade(first.signal);
    await flushPromises();
    // A second screen focuses while the first run is still in flight…
    dispatchUpgrade(second.signal);

    // …the first screen blurs, and the in-flight attempt then fails
    // terminally. The run ended with the failure, not the abort: retrying
    // is pointless by definition, so the takeover must not restart the run
    // — that would re-execute the steps and report the same error twice.
    first.abort();
    rejectFirst(
      new MoneyAccountUpgradeStepError(
        'eip-7702-authorization',
        new TerminalUpgradeError(
          'account is delegated to a third-party implementation',
        ),
      ),
    );
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledTimes(1);
  });

  it('does not restart when the first run settles without being aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const first = new AbortController();
    const second = new AbortController();
    let resolveFirst: () => void = () => undefined;
    mockUpgradeAccount.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    dispatchUpgrade(first.signal);
    await flushPromises();
    dispatchUpgrade(second.signal);

    resolveFirst();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('allows a subsequent upgrade after a previous one resolves', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    dispatchUpgrade();
    await flushPromises();
    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('does not deduplicate upgrades for different addresses', async () => {
    mockUpgradeAccount.mockReturnValue(new Promise(() => undefined));

    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({ address: ADDRESS });
    dispatchUpgrade();
    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({
      address: OTHER_ADDRESS,
    });
    dispatchUpgrade();
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(1, ADDRESS);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(2, OTHER_ADDRESS);
  });
});
