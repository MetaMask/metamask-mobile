import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getPredictNextControllerInitMessenger,
  type PredictNextControllerInitMessenger,
} from './predict-next-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PredictNextControllerInitMessenger>,
  MessengerEvents<PredictNextControllerInitMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({ namespace: MOCK_ANY_NAMESPACE });
}

describe('getPredictNextControllerInitMessenger', () => {
  it('delegates AuthenticationController:getBearerToken', async () => {
    const rootMessenger = getRootMessenger();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('test-bearer-token'),
    );
    const initMessenger = getPredictNextControllerInitMessenger(rootMessenger);

    const token = await initMessenger.call(
      'AuthenticationController:getBearerToken',
    );

    expect(token).toBe('test-bearer-token');
  });
});
