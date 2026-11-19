import Logger from '../../../util/Logger';
import { moneyAccountRestore } from './moneyAccountRestore';
import { restoreMpcMoneyAccount } from './restoreMpcMoneyAccount';

jest.mock('./restoreMpcMoneyAccount', () => ({
  restoreMpcMoneyAccount: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockRestore = jest.mocked(restoreMpcMoneyAccount);

describe('moneyAccountRestore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    moneyAccountRestore.reset();
  });

  it('returns restored and keeps the restored status when the restore works', async () => {
    mockRestore.mockResolvedValue(undefined);

    const result = await moneyAccountRestore.restore('0xabc');

    expect(result).toBe('restored');
    expect(mockRestore).toHaveBeenCalledWith('0xabc');
    expect(moneyAccountRestore.getStatus()).toBe('restored');
  });

  it('returns failed, logs, and keeps the failed status', async () => {
    const error = new Error('boom');
    mockRestore.mockRejectedValue(error);

    const result = await moneyAccountRestore.restore('0xabc');

    expect(result).toBe('failed');
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Money MPC account restore failed',
    );
    expect(moneyAccountRestore.getStatus()).toBe('failed');
  });

  it('begin starts verification', () => {
    const started = moneyAccountRestore.begin();

    expect(started).toBe(true);
    expect(moneyAccountRestore.getStatus()).toBe('verifying');
  });

  it('begin returns false while a sign-in is already claimed', () => {
    moneyAccountRestore.begin();

    const startedAgain = moneyAccountRestore.begin();

    expect(startedAgain).toBe(false);
  });

  it('end releases a claimed sign-in so the next begin succeeds', () => {
    moneyAccountRestore.begin();

    moneyAccountRestore.end();

    expect(moneyAccountRestore.getStatus()).toBe('idle');
    expect(moneyAccountRestore.begin()).toBe(true);
  });

  it('begin returns false while a restore runs and true once it finishes', async () => {
    let finish: () => void = () => undefined;
    mockRestore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    const running = moneyAccountRestore.restore('0xabc');
    const startedDuringRestore = moneyAccountRestore.begin();
    finish();
    await running;

    expect(startedDuringRestore).toBe(false);
    expect(moneyAccountRestore.begin()).toBe(true);
  });

  it('end after a failed restore returns to the failed status', async () => {
    mockRestore.mockRejectedValue(new Error('boom'));
    await moneyAccountRestore.restore('0xabc');

    const started = moneyAccountRestore.begin();
    moneyAccountRestore.end();

    expect(started).toBe(true);
    expect(moneyAccountRestore.getStatus()).toBe('failed');
  });

  it('reset releases a claimed sign-in', () => {
    moneyAccountRestore.begin();

    moneyAccountRestore.reset();

    expect(moneyAccountRestore.begin()).toBe(true);
  });

  it('keeps the restoring status while the restore runs', async () => {
    let finish: () => void = () => undefined;
    mockRestore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    moneyAccountRestore.begin();

    const running = moneyAccountRestore.restore('0xabc');
    const statusWhileRunning = moneyAccountRestore.getStatus();
    finish();
    const result = await running;

    expect(statusWhileRunning).toBe('restoring');
    expect(result).toBe('restored');
    expect(moneyAccountRestore.getStatus()).toBe('restored');
  });

  it('notifies subscribers and clears a failure on reset', async () => {
    mockRestore.mockRejectedValue(new Error('boom'));
    await moneyAccountRestore.restore('0xabc');
    const listener = jest.fn();
    const unsubscribe = moneyAccountRestore.subscribe(listener);

    moneyAccountRestore.reset();
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(moneyAccountRestore.getStatus()).toBe('idle');
  });
});
