import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  notifyHwSubmissionOutcome,
  registerHwSubmissionOutcomeListener,
} from './hwSubmissionOutcome';

describe('hwSubmissionOutcome', () => {
  it('notifies the registered listener once', () => {
    const listener = jest.fn();
    const id = registerHwSubmissionOutcomeListener(listener);
    const transaction = { id: 'tx-1' } as TransactionMeta;

    notifyHwSubmissionOutcome(id, { status: 'submitted', transaction });
    notifyHwSubmissionOutcome(id, { status: 'failed' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'submitted', transaction });
  });

  it('issues unique ids per registration', () => {
    const first = registerHwSubmissionOutcomeListener(jest.fn());
    const second = registerHwSubmissionOutcomeListener(jest.fn());

    expect(first).not.toBe(second);
  });

  it('ignores missing and unknown ids', () => {
    expect(() => {
      notifyHwSubmissionOutcome(undefined, { status: 'failed' });
      notifyHwSubmissionOutcome('unknown', { status: 'failed' });
    }).not.toThrow();
  });
});
