import {
  clearMusdRescueInFlightForTests,
  flushMusdRescueInFlightForTests,
  isMusdRescueSendInFlight,
  markMusdRescueSendSetupFailed,
  registerMusdRescueSendSubmission,
  subscribeMusdRescueSetupFailures,
} from './musdRescueInFlight';

describe('musdRescueInFlight', () => {
  afterEach(() => {
    clearMusdRescueInFlightForTests();
  });

  describe('registerMusdRescueSendSubmission', () => {
    it('tracks a submission until its completion resolves', async () => {
      let resolveCompletion: (reason: 'submitted' | 'failed') => void = () =>
        undefined;
      const completion = new Promise<'submitted' | 'failed'>((resolve) => {
        resolveCompletion = resolve;
      });

      registerMusdRescueSendSubmission({ batchId: 'batch-1', completion });

      expect(isMusdRescueSendInFlight()).toBe(true);

      resolveCompletion('submitted');
      await flushMusdRescueInFlightForTests();

      expect(isMusdRescueSendInFlight()).toBe(false);
    });

    it('drops the entry when the completion rejects', async () => {
      let rejectCompletion: (error: Error) => void = () => undefined;
      const completion = new Promise<'submitted' | 'failed'>(
        (_resolve, reject) => {
          rejectCompletion = reject;
        },
      );

      registerMusdRescueSendSubmission({ batchId: 'batch-2', completion });

      expect(isMusdRescueSendInFlight()).toBe(true);

      rejectCompletion(new Error('setup failed'));
      await flushMusdRescueInFlightForTests();

      expect(isMusdRescueSendInFlight()).toBe(false);
    });

    it('rejects nothing when the tracked submission never settles', async () => {
      const completion = new Promise<'submitted' | 'failed'>(() => undefined);

      registerMusdRescueSendSubmission({ batchId: 'batch-3', completion });

      await flushMusdRescueInFlightForTests();

      // The 50ms race timeout in the flush helper unblocks the test even
      // though the submission is still pending.
      expect(isMusdRescueSendInFlight()).toBe(true);
    });
  });

  describe('subscribeMusdRescueSetupFailures', () => {
    it('notifies listeners with the failed batch id', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeMusdRescueSetupFailures(listener);

      markMusdRescueSendSetupFailed('batch-4');

      expect(listener).toHaveBeenCalledWith('batch-4');

      unsubscribe();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeMusdRescueSetupFailures(listener);

      unsubscribe();
      markMusdRescueSendSetupFailed('batch-5');

      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies every active subscriber', () => {
      const first = jest.fn();
      const second = jest.fn();
      const unsubscribeFirst = subscribeMusdRescueSetupFailures(first);
      const unsubscribeSecond = subscribeMusdRescueSetupFailures(second);

      markMusdRescueSendSetupFailed('batch-6');

      expect(first).toHaveBeenCalledWith('batch-6');
      expect(second).toHaveBeenCalledWith('batch-6');

      unsubscribeFirst();
      unsubscribeSecond();
    });
  });
});
