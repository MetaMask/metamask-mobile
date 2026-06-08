import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getTransactionControllerInitMessenger,
  getTransactionControllerMessenger,
} from './transaction-controller-messenger';

const getRootMessenger = () =>
  new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTransactionControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();

    const result = getTransactionControllerMessenger(rootMessenger);

    expect(result).toBeDefined();
    expect(typeof result.call).toBe('function');
    expect(typeof result.subscribe).toBe('function');
  });

  it('delegates TC67 runtime actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'GasFeeController:fetchGasFeeEstimates',
          'KeyringController:signTransaction',
          'NetworkController:getEIP1559Compatibility',
          'NetworkController:getNetworkClientRegistry',
          'NetworkController:getState',
        ]),
      }),
    );
  });
});

describe('getTransactionControllerInitMessenger', () => {
  it('delegates TC67 runtime actions to the init messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getTransactionControllerInitMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'GasFeeController:fetchGasFeeEstimates',
          'KeyringController:signTransaction',
          'NetworkController:getNetworkClientRegistry',
          'NetworkController:getState',
          'PredictController:beforeSign',
        ]),
      }),
    );
  });
});
