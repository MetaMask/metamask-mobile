import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { getProfileMetricsControllerMessenger } from './profile-metrics-controller-messenger';

const getRootMessenger = () =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getProfileMetricsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const profileMetricsControllerMessenger =
      getProfileMetricsControllerMessenger(messenger);

    expect(profileMetricsControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileMetricsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AccountsController:getState',
          'ProfileMetricsService:submitMetrics',
        ]),
      }),
    );
  });

  it('delegates required events to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getProfileMetricsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountsController:accountAdded',
          'AccountsController:accountRemoved',
          'KeyringController:lock',
          'KeyringController:unlock',
          'TransactionController:transactionSubmitted',
        ]),
      }),
    );
  });
});
