import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAssetsControllerMessenger,
  getAssetsControllerInitMessenger,
} from './assets-controller-messenger';

const ASSETS_CONTROLLER_DELEGATED_ACTIONS = [
  'AccountTreeController:getAccountsFromSelectedAccountGroup',
  'AccountTreeController:isInitialized',
  'ClientController:getState',
  'KeyringController:isUnlocked',
  'ConfigRegistryController:getNetworkConfigByCaip2ChainId',
  'NetworkEnablementController:getState',
  'NetworkController:getState',
  'NetworkController:getNetworkClientById',
  'AccountsController:getSelectedAccount',
  'SnapController:handleRequest',
  'SnapController:getRunnableSnaps',
  'PermissionController:getPermissions',
  'PhishingController:bulkScanTokens',
  'RemoteFeatureFlagController:getState',
] as const;

const ASSETS_CONTROLLER_DELEGATED_EVENTS = [
  'AccountTreeController:selectedAccountGroupChange',
  'AccountTreeController:initialized',
  'AccountTreeController:uninitialized',
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

  it('delegates AccountActivityService balanceUpdated event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountActivityService:balanceUpdated',
        ]),
      }),
    );
  });

  it('delegates AccountTreeController isInitialized action (core#10059)', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AccountTreeController:isInitialized',
        ]),
      }),
    );
  });

  it('delegates ClientController getState action (core#10059)', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(['ClientController:getState']),
      }),
    );
  });

  it('delegates KeyringController isUnlocked action (core#10059)', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(['KeyringController:isUnlocked']),
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
          'AccountTreeController:initialized',
          'AccountTreeController:uninitialized',
          'NetworkEnablementController:stateChange',
          'ClientController:stateChange',
        ]),
      }),
    );
  });

  it('delegates AccountTreeController initialized event (core#9892)', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining(['AccountTreeController:initialized']),
      }),
    );
  });

  it('delegates AccountTreeController uninitialized event (core#9892)', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining(['AccountTreeController:uninitialized']),
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

  it('delegates AccountActivityService statusChanged event', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getAssetsControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountActivityService:statusChanged',
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
