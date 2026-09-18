import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { RewardsMoneyDataServiceMessenger } from '../controllers/rewards-money-controller/services/rewards-money-data-service';
import { getRewardsMoneyDataServiceMessenger } from './rewards-money-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RewardsMoneyDataServiceMessenger>,
  MessengerEvents<RewardsMoneyDataServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRewardsMoneyDataServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const messenger = getRewardsMoneyDataServiceMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
