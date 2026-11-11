import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { RewardsDataServiceMessenger } from '../controllers/rewards-controller/services/rewards-data-service';
import { getRewardsDataServiceMessenger } from './rewards-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RewardsDataServiceMessenger>,
  MessengerEvents<RewardsDataServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRewardsDataServiceMessenger', () => {
  it('delegates AuthenticationController:getBearerToken', async () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('profile-token'),
    );
    const rewardsDataServiceMessenger =
      getRewardsDataServiceMessenger(rootMessenger);

    expect(rewardsDataServiceMessenger).toBeInstanceOf(Messenger);
    await expect(
      rewardsDataServiceMessenger.call(
        'AuthenticationController:getBearerToken',
      ),
    ).resolves.toBe('profile-token');
  });
});
