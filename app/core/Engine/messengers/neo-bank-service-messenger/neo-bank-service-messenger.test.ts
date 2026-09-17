import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { NeoBankServiceMessenger } from '@metamask/ramps-controller';
import { getNeoBankServiceMessenger } from './neo-bank-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NeoBankServiceMessenger>,
  MessengerEvents<NeoBankServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getNeoBankServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const neoBankServiceMessenger = getNeoBankServiceMessenger(rootMessenger);

    expect(neoBankServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates AuthenticationController:getBearerToken so NeoBankService can call it', async () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('test-bearer-token'),
    );
    const neoBankServiceMessenger = getNeoBankServiceMessenger(rootMessenger);

    const token = await neoBankServiceMessenger.call(
      'AuthenticationController:getBearerToken',
    );

    expect(token).toBe('test-bearer-token');
  });
});
