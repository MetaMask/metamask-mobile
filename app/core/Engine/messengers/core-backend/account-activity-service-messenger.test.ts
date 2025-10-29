import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getAccountActivityServiceMessenger } from './account-activity-service-messenger';
import { AccountActivityServiceMessenger } from '@metamask/core-backend';

type RootMessenger = ExtendedMessenger<
  MockAnyNamespace,
  MessengerActions<AccountActivityServiceMessenger>,
  MessengerEvents<AccountActivityServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new ExtendedMessenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getAccountActivityServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const accountActivityServiceMessenger =
      getAccountActivityServiceMessenger(rootMessenger);

    expect(accountActivityServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('allows required actions and events', () => {
    const rootMessenger = getRootMessenger();

    expect(() =>
      getAccountActivityServiceMessenger(rootMessenger),
    ).not.toThrow();
  });
});
