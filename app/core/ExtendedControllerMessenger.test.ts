import { ExtendedControllerMessenger } from './ExtendedControllerMessenger';

const EVENT_TYPE_MOCK = 'TestController:testEvent';
const EVENT_ARG_MOCK = { test: 'value' };

interface EventMock {
  type: typeof EVENT_TYPE_MOCK;
  payload: [{ test: string }];
}

describe('ExtendedControllerMessenger', () => {
  describe('subscribeOnceIf', () => {
    it('calls handler once and only if criteria matches', () => {
      const messenger = new ExtendedControllerMessenger<never, EventMock>();
      const handler = jest.fn();

      const criteria = jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      messenger.subscribeOnceIf(EVENT_TYPE_MOCK, handler, criteria);
      messenger.publish(EVENT_TYPE_MOCK, EVENT_ARG_MOCK);
      messenger.publish(EVENT_TYPE_MOCK, EVENT_ARG_MOCK);
      messenger.publish(EVENT_TYPE_MOCK, EVENT_ARG_MOCK);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(EVENT_ARG_MOCK);

      expect(criteria).toHaveBeenCalledTimes(2);
      expect(criteria).toHaveBeenCalledWith(EVENT_ARG_MOCK);
    });
  });

  describe('tryUnsubscribe', () => {
    it('unsubscribes handler', () => {
      const messenger = new ExtendedControllerMessenger<never, EventMock>();
      const handler = jest.fn();

      messenger.subscribe(EVENT_TYPE_MOCK, handler);
      messenger.tryUnsubscribe(EVENT_TYPE_MOCK, handler);
      messenger.publish(EVENT_TYPE_MOCK, EVENT_ARG_MOCK);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing if no handler', () => {
      const messenger = new ExtendedControllerMessenger<never, EventMock>();
      messenger.tryUnsubscribe(EVENT_TYPE_MOCK, undefined);
    });

    it('does nothing if already unsubscribed', () => {
      const messenger = new ExtendedControllerMessenger<never, EventMock>();
      const handler = jest.fn();

      messenger.subscribe(EVENT_TYPE_MOCK, handler);
      messenger.tryUnsubscribe(EVENT_TYPE_MOCK, handler);
      messenger.tryUnsubscribe(EVENT_TYPE_MOCK, handler);
      messenger.publish(EVENT_TYPE_MOCK, EVENT_ARG_MOCK);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
