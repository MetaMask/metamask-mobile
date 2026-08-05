import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAssetsControllerMessenger,
  getAssetsControllerInitMessenger,
} from './assets-controller-messenger';

const ASSETS_CONTROLLER_DELEGATED_ACTIONS = [
  'AccountTreeController:getAccountsFromSelectedAccountGroup',
  'NetworkEnablementController:getState',
  'NetworkController:getState',
  'NetworkController:getNetworkClientById',
  'AccountsController:getSelectedAccount',
  'ConfigRegistryController:getNetworkConfigByCaip2ChainId',
  'SnapController:handleRequest',
  'SnapController:getRunnableSnaps',
  'PermissionController:getPermissions',
  'PhishingController:bulkScanTokens',
  'RemoteFeatureFlagController:getState',
] as const;

const ASSETS_CONTROLLER_DELEGATED_EVENTS = [
  'AccountTreeController:selectedAccountGroupChange',
  'AccountTreeController:stateChange',
  'NetworkEnablementController:stateChange',
  'ClientController:stateChange',
  'KeyringController:lock',
  'KeyringController:unlock',
  'NetworkController:networkDidChange',
  'NetworkController:networkAdded',
  'NetworkController:networkRemoved',
  'NetworkController:stateChange',
  'AccountsController:accountBalancesUpdated',
  'PermissionController:stateChange',
  'SnapController:snapInstalled',
  'PreferencesController:stateChange',
  'TransactionController:transactionConfirmed',
  'TransactionController:unapprovedTransactionAdded',
  'AccountActivityService:balanceUpdated',
  'AccountActivityService:statusChanged',
  'RemoteFeatureFlagController:stateChange',
] as const;

const getRootMessenger = () =>
  new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

afterEach(() => {
  jest.restoreAllMocks();
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
          ...ASSETS_CONTROLLER_DELEGATED_ACTIONS,
        ]),
      }),
    );
  });

  it('delegates AccountsController accountBalancesUpdated event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountsController:accountBalancesUpdated',
        ]),
      }),
    );
  });

  it('delegates AccountActivityService balanceUpdated and statusChanged events', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountActivityService:balanceUpdated',
          'AccountActivityService:statusChanged',
        ]),
      }),
    );
  });

  it('delegates core#9388 account-group and network-enablement events', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountTreeController:selectedAccountGroupChange',
          'AccountTreeController:stateChange',
          'NetworkEnablementController:stateChange',
          'ClientController:stateChange',
        ]),
      }),
    );
  });

  it('delegates NetworkController networkDidChange event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining(['NetworkController:networkDidChange']),
      }),
    );
  });

  it('delegates NetworkController stateChange event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining(['NetworkController:stateChange']),
      }),
    );
  });

  it('delegates the config registry multicall3 lookup action', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'ConfigRegistryController:getNetworkConfigByCaip2ChainId',
        ]),
      }),
    );
  });

  it('delegates RemoteFeatureFlagController getState action', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'RemoteFeatureFlagController:getState',
        ]),
      }),
    );
  });

  it('delegates RemoteFeatureFlagController stateChange event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'RemoteFeatureFlagController:stateChange',
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
        events: expect.arrayContaining([...ASSETS_CONTROLLER_DELEGATED_EVENTS]),
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
