import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RewardsMoneyDataServiceMessenger } from '../controllers/rewards-money-controller/services';
import { getRewardsMoneyDataServiceMessenger } from './rewards-money-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RewardsMoneyDataServiceMessenger>,
  MessengerEvents<RewardsMoneyDataServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({ namespace: MOCK_ANY_NAMESPACE });
}

describe('getRewardsMoneyDataServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger = getRootMessenger();

    const messenger = getRewardsMoneyDataServiceMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates the bearer-token action the referral-program API needs', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getRewardsMoneyDataServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: ['AuthenticationController:getBearerToken'],
      }),
    );
  });
});
