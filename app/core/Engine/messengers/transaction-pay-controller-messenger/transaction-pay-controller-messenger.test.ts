import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import {
  getTransactionPayControllerInitMessenger,
  getTransactionPayControllerMessenger,
  type TransactionPayControllerInitMessenger,
} from './transaction-pay-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<TransactionPayControllerMessenger>
  | MessengerActions<TransactionPayControllerInitMessenger>,
  | MessengerEvents<TransactionPayControllerMessenger>
  | MessengerEvents<TransactionPayControllerInitMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getTransactionPayControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();

    const result = getTransactionPayControllerMessenger(rootMessenger);

    expect(result).toBeInstanceOf(Messenger);
  });

  it('delegates SentinelApiService:simulateTransactions', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionPayControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'SentinelApiService:simulateTransactions',
        ]),
      }),
    );
  });

  it('delegates Money Account vault submission actions', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionPayControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'MoneyAccountBalanceService:getMoneyAccountBalance',
          'TransactionController:addTransactionBatch',
        ]),
      }),
    );
  });
});

describe('getTransactionPayControllerInitMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();

    const result = getTransactionPayControllerInitMessenger(rootMessenger);

    expect(result).toBeInstanceOf(Messenger);
  });
});
