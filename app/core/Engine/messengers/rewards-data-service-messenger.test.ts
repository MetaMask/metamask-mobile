import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getRewardsDataServiceMessenger } from './rewards-data-service-messenger';

describe('getRewardsDataServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const rewardsDataServiceMessenger =
      getRewardsDataServiceMessenger(messenger);

    expect(rewardsDataServiceMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});
