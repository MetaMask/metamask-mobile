import {
  consumeHomepageSearchReturnTransition,
  scheduleHomepageSearchReturnTransition,
  subscribeToHomepageSearchReturnTransition,
} from './homepageSearchTransition';

describe('homepageSearchTransition', () => {
  it('hands the pending return transition to the homepage once', () => {
    const transition = {
      origin: { x: 48, y: 48, width: 220, height: 40 },
      showPastePill: true,
    };

    scheduleHomepageSearchReturnTransition(transition);

    expect(consumeHomepageSearchReturnTransition()).toEqual(transition);
    expect(consumeHomepageSearchReturnTransition()).toBeUndefined();
  });

  it('notifies the mounted homepage before navigation reveals it', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToHomepageSearchReturnTransition(listener);
    const transition = {
      origin: { x: 48, y: 48, width: 220, height: 40 },
      showPastePill: false,
    };

    scheduleHomepageSearchReturnTransition(transition);
    unsubscribe();

    expect(listener).toHaveBeenCalledWith(transition);
    expect(consumeHomepageSearchReturnTransition()).toEqual(transition);
  });
});
