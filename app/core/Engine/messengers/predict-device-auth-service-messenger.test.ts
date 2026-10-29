import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import { getPredictDeviceAuthServiceMessenger } from './predict-device-auth-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictDeviceAuthServiceActions,
  never
>;

describe('getPredictDeviceAuthServiceMessenger', () => {
  it('exposes every registered capability action to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger =
      getPredictDeviceAuthServiceMessenger(rootMessenger);
    const ensureDeviceKey = jest.fn().mockResolvedValue(null);
    const getA2t = jest.fn().mockResolvedValue('opaque-a2t');
    const prefetch = jest.fn().mockResolvedValue(undefined);
    const clear = jest.fn();
    const reset = jest.fn().mockResolvedValue(undefined);
    serviceMessenger.registerActionHandler(
      'PredictDeviceAuthService:ensureDeviceKey',
      ensureDeviceKey,
    );
    serviceMessenger.registerActionHandler(
      'PredictDeviceAuthService:getA2t',
      getA2t,
    );
    serviceMessenger.registerActionHandler(
      'PredictDeviceAuthService:prefetch',
      prefetch,
    );
    serviceMessenger.registerActionHandler(
      'PredictDeviceAuthService:clear',
      clear,
    );
    serviceMessenger.registerActionHandler(
      'PredictDeviceAuthService:reset',
      reset,
    );

    await rootMessenger.call('PredictDeviceAuthService:ensureDeviceKey');
    await expect(
      rootMessenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('opaque-a2t');
    await rootMessenger.call('PredictDeviceAuthService:prefetch', false);
    rootMessenger.call('PredictDeviceAuthService:clear');
    await rootMessenger.call('PredictDeviceAuthService:reset');

    expect(ensureDeviceKey).toHaveBeenCalledTimes(1);
    expect(getA2t).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith(false);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
