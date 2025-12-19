import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { SmartTransactionsControllerMessenger } from '@metamask/smart-transactions-controller';
import { getSmartTransactionsControllerMessenger } from './smart-transactions-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SmartTransactionsControllerMessenger>,
  MessengerEvents<SmartTransactionsControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getSmartTransactionsControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();

    const result = getSmartTransactionsControllerMessenger(rootMessenger);

    expect(result).toBeInstanceOf(Messenger);
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSmartTransactionsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'ErrorReportingService:captureException',
          'NetworkController:getNetworkClientById',
          'NetworkController:getState',
          'RemoteFeatureFlagController:getState',
          'TransactionController:getNonceLock',
          'TransactionController:getTransactions',
          'TransactionController:updateTransaction',
        ]),
      }),
    );
  });

  it('delegates required events to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSmartTransactionsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'NetworkController:stateChange',
          'RemoteFeatureFlagController:stateChange',
        ]),
      }),
    );
  });
});
