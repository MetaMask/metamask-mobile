import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictNextControllerActions,
  PredictNextControllerEvents,
} from '../../../components/UI/PredictNext/controller/PredictNextController';
import {
  getPredictNextControllerInitMessenger,
  getPredictNextControllerMessenger,
  type PredictNextControllerInitMessenger,
} from './predict-next-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<PredictNextControllerInitMessenger>
  | PredictNextControllerActions,
  | MessengerEvents<PredictNextControllerInitMessenger>
  | PredictNextControllerEvents
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({ namespace: MOCK_ANY_NAMESPACE });
}

describe('getPredictNextControllerMessenger', () => {
  it('creates the controller namespace for service child messengers', () => {
    const rootMessenger = getRootMessenger();

    const controllerMessenger =
      getPredictNextControllerMessenger(rootMessenger);
    const marketDataMessenger = controllerMessenger.buildChild({
      namespace: 'PredictMarketDataService',
      actions: [],
      events: [],
    });
    const portfolioMessenger = controllerMessenger.buildChild({
      namespace: 'PredictPortfolioService',
      actions: [],
      events: [],
    });

    expect(controllerMessenger).toBeInstanceOf(Messenger);
    expect(marketDataMessenger).toBeInstanceOf(Messenger);
    expect(portfolioMessenger).toBeInstanceOf(Messenger);
  });
});

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
