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

  it('delegates the RampsController actions the fiat pay strategy needs', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionPayControllerMessenger(rootMessenger);

    // getQuoteWithFees is required so the fiat estimate gets fees already
    // reconciled to the resolved provider (including the native Transak fee);
    // without it the estimate cannot be produced.
    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'RampsController:getOrder',
          'RampsController:getQuoteWithFees',
        ]),
      }),
    );
  });

  it('does not delegate the native Transak lookup that RampsController now owns', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionPayControllerMessenger(rootMessenger);

    // The native fee lookup moved into RampsController:getQuoteWithFees, so the
    // TransactionPayController messenger no longer needs the stateless
    // TransakService:getBuyQuote probe (or the aggregator getQuotes action).
    const delegatedActions = delegateSpy.mock.calls[0][0].actions;
    expect(delegatedActions).not.toContain('TransakService:getBuyQuote');
    expect(delegatedActions).not.toContain('RampsController:getQuotes');
    expect(delegatedActions).not.toContain(
      'RampsController:transakGetBuyQuote',
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
