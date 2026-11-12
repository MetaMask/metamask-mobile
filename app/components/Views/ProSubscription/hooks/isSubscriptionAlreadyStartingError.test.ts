import {
  isSubscriptionAlreadyStartingError,
  SUBSCRIPTION_ALREADY_STARTING_MESSAGE,
} from './isSubscriptionAlreadyStartingError';

describe('isSubscriptionAlreadyStartingError', () => {
  it('matches the in-progress subscription error', () => {
    expect(
      isSubscriptionAlreadyStartingError(
        new Error(SUBSCRIPTION_ALREADY_STARTING_MESSAGE),
      ),
    ).toBe(true);
  });

  it('rejects other errors and non-errors', () => {
    expect(
      isSubscriptionAlreadyStartingError(new Error('signing rejected')),
    ).toBe(false);
    expect(isSubscriptionAlreadyStartingError('already starting')).toBe(false);
    expect(isSubscriptionAlreadyStartingError(undefined)).toBe(false);
  });
});
