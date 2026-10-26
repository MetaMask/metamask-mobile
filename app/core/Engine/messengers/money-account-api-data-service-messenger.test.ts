import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { MoneyAccountApiDataServiceMessenger } from '@metamask/money-account-api-data-service';
import { getMoneyAccountApiDataServiceMessenger } from './money-account-api-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MoneyAccountApiDataServiceMessenger>,
  MessengerEvents<MoneyAccountApiDataServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getMoneyAccountApiDataServiceMessenger', () => {
  it('delegates KeyringController:signPersonalMessage to the service messenger', async () => {
    const rootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'KeyringController:signPersonalMessage',
      jest.fn().mockResolvedValue('0xsignature'),
    );
    const serviceMessenger =
      getMoneyAccountApiDataServiceMessenger(rootMessenger);

    const signature = await serviceMessenger.call(
      'KeyringController:signPersonalMessage',
      { data: 'message', from: '0xaddress' },
    );

    expect(signature).toBe('0xsignature');
  });

  it('delegates AuthenticationController:getBearerToken to the service messenger', async () => {
    const rootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('test-bearer-token'),
    );
    const serviceMessenger =
      getMoneyAccountApiDataServiceMessenger(rootMessenger);

    const token = await serviceMessenger.call(
      'AuthenticationController:getBearerToken',
    );

    expect(token).toBe('test-bearer-token');
  });
});
