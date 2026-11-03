import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getTransactionControllerInitMessenger,
  type TransactionControllerInitMessenger,
} from './transaction-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<TransactionControllerInitMessenger>,
  MessengerEvents<TransactionControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getTransactionControllerInitMessenger', () => {
  it('returns a messenger instance', () => {
    const messenger = getTransactionControllerInitMessenger(getRootMessenger());

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates the actions the Solana Pay publish path calls', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionControllerInitMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AccountsController:getState',
          'ConfigRegistryController:getNetworkConfigByCaip2ChainId',
          'SnapController:handleRequest',
          'TransactionPayController:getInfuraProjectId',
          'TransactionPayController:reconcileSolanaPay',
        ]),
      }),
    );
  });
});
