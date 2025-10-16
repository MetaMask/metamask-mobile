import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getSmartTransactionsControllerMessenger } from './smart-transactions-controller-messenger';

describe('getSmartTransactionsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const smartTransactionsControllerMessenger =
      getSmartTransactionsControllerMessenger(messenger);

    expect(smartTransactionsControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
