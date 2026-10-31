import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  ConfigRegistryControllerGetStateAction,
  ConfigRegistryControllerState,
  ConfigRegistryControllerStateChangedEvent,
} from '@metamask/config-registry-controller';
import { getAnalyticsControllerMessenger } from './analytics-controller-messenger';

const buildRootMessenger = () =>
  new Messenger<
    MockAnyNamespace,
    ConfigRegistryControllerGetStateAction,
    ConfigRegistryControllerStateChangedEvent
  >({ namespace: MOCK_ANY_NAMESPACE });

const configRegistryState = {
  configs: { eventsConfig: null },
} as unknown as ConfigRegistryControllerState;

describe('getAnalyticsControllerMessenger', () => {
  it('lets the controller read ConfigRegistryController state', () => {
    const rootMessenger = buildRootMessenger();
    rootMessenger.registerActionHandler(
      'ConfigRegistryController:getState',
      () => configRegistryState,
    );

    const messenger = getAnalyticsControllerMessenger(rootMessenger as never);

    expect(messenger.call('ConfigRegistryController:getState')).toBe(
      configRegistryState,
    );
  });

  it('forwards ConfigRegistryController state changes to the controller', () => {
    const rootMessenger = buildRootMessenger();
    const messenger = getAnalyticsControllerMessenger(rootMessenger as never);
    const listener = jest.fn();
    messenger.subscribe('ConfigRegistryController:stateChanged', listener);

    rootMessenger.publish(
      'ConfigRegistryController:stateChanged',
      configRegistryState,
      [],
    );

    expect(listener).toHaveBeenCalledWith(configRegistryState, []);
  });
});
