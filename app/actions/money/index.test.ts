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
        upgradeAccountWithRetry: jest.fn(),
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
  .upgradeAccountWithRetry as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockLogError = Logger.error as jest.Mock;
const mockLogLog = Logger.log as jest.Mock;
const mockWhenReady = whenMoneyAccountUpgradeReady as jest.Mock;

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as const;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('upgradeMoneyAccount', () => {
  let dispatch: jest.Mock;
  let getState: jest.Mock<RootState>;

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

  it('calls MoneyAccountUpgradeController.upgradeAccountWithRetry with the primary money account address', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS, {
      signal: undefined,
    });
  });

  it('logs the start of an upgrade, noting the account was not previously recorded', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

  it('does not log success when the upgrade fails', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockRejectedValueOnce(new Error('boom'));

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogLog).not.toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade succeeded',
      expect.anything(),
    );
  });

  it('passes the provided AbortSignal to upgradeAccountWithRetry', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();

    upgradeMoneyAccount(abortController.signal)(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS, {
      signal: abortController.signal,
    });
  });

  it('logs quietly (no Sentry error) when the upgrade rejects after the signal aborted', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockImplementationOnce(() => {
      abortController.abort();
      return Promise.reject(new Error('Money Account upgrade retry aborted'));
    });

    upgradeMoneyAccount(abortController.signal)(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade aborted; skipping',
      { address: ADDRESS },
    );
  });

  it('allows a new upgrade after an aborted one settles', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const abortController = new AbortController();
    mockUpgradeAccount.mockImplementationOnce(() => {
      abortController.abort();
      return Promise.reject(new Error('Money Account upgrade retry aborted'));
    });

    upgradeMoneyAccount(abortController.signal)(dispatch, getState, undefined);
    await flushPromises();
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('skips the call and logs when there is no primary money account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalled();
  });

  it('skips the call when the primary money account address is not a strict hex string', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: 'not-hex' });

    upgradeMoneyAccount()(dispatch, getState, undefined);

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

    upgradeMoneyAccount()(dispatch, getState, undefined);
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
    // original message (e.g. by re-wrapping in a generic Error).
    const causeMessage = 'eth_getTransactionCount returned a non-hex value';
    const error = Object.assign(
      new Error(
        `Money Account upgrade failed at step "eip-7702-authorization": ${causeMessage}`,
      ),
      { name: 'MoneyAccountUpgradeStepError', step: 'eip-7702-authorization' },
    );
    mockUpgradeAccount.mockRejectedValueOnce(error);

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

    upgradeMoneyAccount()(dispatch, getState, undefined);
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

    upgradeMoneyAccount()(dispatch, getState, undefined);
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade already in flight; skipping',
      { address: ADDRESS },
    );
  });

  it('allows a subsequent upgrade after a previous one resolves', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('does not deduplicate upgrades for different addresses', async () => {
    mockUpgradeAccount.mockReturnValue(new Promise(() => undefined));

    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({ address: ADDRESS });
    upgradeMoneyAccount()(dispatch, getState, undefined);
    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({
      address: OTHER_ADDRESS,
    });
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(1, ADDRESS, {
      signal: undefined,
    });
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(2, OTHER_ADDRESS, {
      signal: undefined,
    });
  });
});
