import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getRampsActivityServiceMessenger } from './ramps-activity-service-messenger';
import { RampsActivityServiceMessenger } from '@metamask/core-backend';

type RootMessenger = ExtendedMessenger<
  MockAnyNamespace,
  MessengerActions<RampsActivityServiceMessenger>,
  MessengerEvents<RampsActivityServiceMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new ExtendedMessenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getRampsActivityServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const rampsActivityServiceMessenger =
      getRampsActivityServiceMessenger(rootMessenger);

    expect(rampsActivityServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('allows required actions and events', () => {
    const rootMessenger = getRootMessenger();

    expect(() =>
      getRampsActivityServiceMessenger(rootMessenger),
    ).not.toThrow();
  });
});
