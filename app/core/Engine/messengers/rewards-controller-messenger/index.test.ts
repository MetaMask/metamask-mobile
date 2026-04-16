import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { RewardsControllerMessenger , getRewardsControllerMessenger } from './index';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RewardsControllerMessenger>,
  MessengerEvents<RewardsControllerMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRewardsControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();

    const messenger = getRewardsControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
