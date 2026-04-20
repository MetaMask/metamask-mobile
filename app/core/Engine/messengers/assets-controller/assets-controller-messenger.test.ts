import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAssetsControllerMessenger,
  getAssetsControllerInitMessenger,
} from './assets-controller-messenger';

const getRootMessenger = () =>
  new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getAssetsControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();
    const result = getAssetsControllerMessenger(rootMessenger);

    expect(result).toBeDefined();
    expect(typeof result.call).toBe('function');
    expect(typeof result.subscribe).toBe('function');
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AccountsController:getSelectedAccount',
          'AccountTreeController:getAccountsFromSelectedAccountGroup',
          'NetworkEnablementController:getState',
          'NetworkController:getState',
          'NetworkController:getNetworkClientById',
          'TokenListController:getState',
          'BackendWebSocketService:subscribe',
          'BackendWebSocketService:getConnectionInfo',
          'BackendWebSocketService:findSubscriptionsByChannelPrefix',
          'SnapController:handleRequest',
          'SnapController:getRunnableSnaps',
          'PermissionController:getPermissions',
        ]),
      }),
    );
  });

  it('delegates required events to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountTreeController:selectedAccountGroupChange',
          'NetworkEnablementController:stateChange',
          'KeyringController:lock',
          'KeyringController:unlock',
          'PreferencesController:stateChange',
          'NetworkController:stateChange',
          'TransactionController:transactionConfirmed',
          'TransactionController:incomingTransactionsReceived',
          'BackendWebSocketService:connectionStateChanged',
          'AccountsController:accountBalancesUpdated',
          'PermissionController:stateChange',
        ]),
      }),
    );
  });
});

describe('getAssetsControllerInitMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = getRootMessenger();
    const result = getAssetsControllerInitMessenger(rootMessenger);

    expect(result).toBeDefined();
    expect(typeof result.call).toBe('function');
  });

  it('delegates required actions to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerInitMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AuthenticationController:getBearerToken',
          'PreferencesController:getState',
          'RemoteFeatureFlagController:getState',
          'AnalyticsController:trackEvent',
        ]),
      }),
    );
  });

  it('delegates no events to the messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerInitMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [],
      }),
    );
  });
});
