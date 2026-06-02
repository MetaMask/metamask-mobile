import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RampsServiceMessenger } from '@metamask/ramps-controller';
import { getRampsServiceMessenger } from './ramps-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<RampsServiceMessenger>,
  MessengerEvents<RampsServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getRampsServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const rampsServiceMessenger = getRampsServiceMessenger(rootMessenger);

    expect(rampsServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates AuthenticationController:getBearerToken so RampsService can call it', async () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('test-bearer-token'),
    );
    const rampsServiceMessenger = getRampsServiceMessenger(rootMessenger);

    const token = await rampsServiceMessenger.call(
      'AuthenticationController:getBearerToken',
    );

    expect(token).toBe('test-bearer-token');
  });
});
