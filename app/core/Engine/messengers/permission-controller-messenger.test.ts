import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import type { CurrencyRateControllerGetStateAction } from '@metamask/assets-controllers';
import {
  getPermissionControllerMessenger,
  getPermissionControllerInitMessenger,
} from './permission-controller-messenger';
import { RootMessenger } from '../types';

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getPermissionControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const permissionControllerMessenger =
      getPermissionControllerMessenger(rootMessenger);

    expect(permissionControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getPermissionControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    const permissionControllerInitMessenger =
      getPermissionControllerInitMessenger(rootMessenger);

    expect(permissionControllerInitMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates CurrencyRateController:getState for snap_getPreferences', () => {
    const rootMessenger: RootMessenger = getRootMessenger();
    new Messenger<
      'CurrencyRateController',
      CurrencyRateControllerGetStateAction,
      never,
      RootMessenger
    >({
      namespace: 'CurrencyRateController',
      parent: rootMessenger,
    }).registerActionHandler('CurrencyRateController:getState', () => ({
      currentCurrency: 'eur',
      currencyRates: {},
    }));
    const permissionControllerInitMessenger =
      getPermissionControllerInitMessenger(rootMessenger);

    expect(
      (
        permissionControllerInitMessenger as unknown as {
          call: (action: string) => unknown;
        }
      ).call('CurrencyRateController:getState'),
    ).toStrictEqual({ currentCurrency: 'eur', currencyRates: {} });
  });
});
