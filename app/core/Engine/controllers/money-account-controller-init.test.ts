import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getMoneyAccountControllerInitMessenger,
  getMoneyAccountControllerMessenger,
  MoneyAccountControllerInitMessenger,
} from '../messengers/money-account-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountControllerInit } from './money-account-controller-init';
import {
  MoneyAccountController,
  MoneyAccountControllerMessenger,
} from '@metamask/money-account-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { RemoteFeatureFlagControllerStateChangeEvent } from '@metamask/remote-feature-flag-controller';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

jest.mock('@metamask/money-account-controller');
jest.mock('../../../lib/Money/feature-flags');
jest.mock('../../../util/Logger');

const EMPTY_MONEY_ACCOUNTS = { moneyAccounts: {} };
const NON_EMPTY_MONEY_ACCOUNTS = { moneyAccounts: { 'mock-account-id': {} } };

function buildInitRequestMock<
  Events extends RemoteFeatureFlagControllerStateChangeEvent = never,
>(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, Events>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): {
  requestMock: jest.Mocked<
    MessengerClientInitRequest<
      MoneyAccountControllerMessenger,
      MoneyAccountControllerInitMessenger
    >
  >;
  baseMessenger: ExtendedMessenger<MockAnyNamespace, never, Events>;
} {
  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on root messenger.
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({ remoteFeatureFlags: {}, localOverrides: {} }),
  );

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on root messenger.
    'KeyringController:getState',
    jest.fn().mockReturnValue({ isUnlocked: true }),
  );

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountControllerMessenger(baseMessenger),
    initMessenger: getMoneyAccountControllerInitMessenger(baseMessenger),
  } as jest.Mocked<
    MessengerClientInitRequest<
      MoneyAccountControllerMessenger,
      MoneyAccountControllerInitMessenger
    >
  >;

  return { requestMock, baseMessenger };
}

function publishStateChange(
  baseMessenger: ExtendedMessenger<
    MockAnyNamespace,
    never,
    RemoteFeatureFlagControllerStateChangeEvent
  >,
) {
  baseMessenger.publish(
    'RemoteFeatureFlagController:stateChange',
    { remoteFeatureFlags: {}, cacheTimestamp: 0 },
    [],
  );
}

describe('moneyAccountControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { requestMock } = buildInitRequestMock();
    const { controller } = moneyAccountControllerInit(requestMock);
    expect(controller).toBeInstanceOf(MoneyAccountController);
  });

  it('passes the proper arguments to the controller', () => {
    const { requestMock } = buildInitRequestMock();
    moneyAccountControllerInit(requestMock);

    const controllerMock = jest.mocked(MoneyAccountController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });

  describe('RemoteFeatureFlagController:stateChange subscription', () => {
    function buildStateChangeSetup() {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        RemoteFeatureFlagControllerStateChangeEvent
      >({ namespace: MOCK_ANY_NAMESPACE });

      const { requestMock } = buildInitRequestMock(baseMessenger);
      return { requestMock, baseMessenger };
    }

    it('calls controller.init() when flag is enabled and keyring is unlocked', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);

      const { requestMock, baseMessenger } = buildStateChangeSetup();
      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(controller.init)).toHaveBeenCalledTimes(1);
    });

    it('does not call controller.init() when flag is enabled but keyring is locked', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);

      const { requestMock, baseMessenger } = buildStateChangeSetup();

      baseMessenger.unregisterActionHandler(
        // @ts-expect-error: Action not allowed on root messenger.
        'KeyringController:getState',
      );
      baseMessenger.registerActionHandler(
        // @ts-expect-error: Action not allowed on root messenger.
        'KeyringController:getState',
        jest.fn().mockReturnValue({ isUnlocked: false }),
      );

      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(controller.init)).not.toHaveBeenCalled();
    });

    it('does not call controller.init() when flag is enabled but money account already exists', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);

      const { requestMock, baseMessenger } = buildStateChangeSetup();
      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        NON_EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(controller.init)).not.toHaveBeenCalled();
    });

    it('calls controller.clearState() when flag is disabled and money accounts exist', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);

      const { requestMock, baseMessenger } = buildStateChangeSetup();
      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        NON_EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(controller.clearState)).toHaveBeenCalledTimes(1);
    });

    it('does not call controller.clearState() when flag is disabled and no money accounts exist', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);

      const { requestMock, baseMessenger } = buildStateChangeSetup();
      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(controller.clearState)).not.toHaveBeenCalled();
    });

    it('respects localOverrides over remoteFeatureFlags when determining if flag is enabled', async () => {
      // isMoneyAccountEnabled is mocked globally, so we restore it for this test
      // to verify that getResolvedRemoteFeatureFlags correctly merges the flags.
      jest.mocked(isMoneyAccountEnabled).mockRestore();

      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        RemoteFeatureFlagControllerStateChangeEvent
      >({ namespace: MOCK_ANY_NAMESPACE });

      const { requestMock } = buildInitRequestMock(baseMessenger);

      // Override getState: remoteFeatureFlags has the flag disabled, localOverrides enables it
      baseMessenger.unregisterActionHandler(
        // @ts-expect-error: Action not allowed on root messenger.
        'RemoteFeatureFlagController:getState',
      );
      baseMessenger.registerActionHandler(
        // @ts-expect-error: Action not allowed on root messenger.
        'RemoteFeatureFlagController:getState',
        jest.fn().mockReturnValue({
          remoteFeatureFlags: {
            moneyEnableMoneyAccount: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
          },
          localOverrides: {
            moneyEnableMoneyAccount: { enabled: true, minimumVersion: '0.0.0' },
          },
        }),
      );

      const { controller } = moneyAccountControllerInit(requestMock);
      (controller as unknown as { state: unknown }).state =
        EMPTY_MONEY_ACCOUNTS;

      publishStateChange(baseMessenger);
      await Promise.resolve();

      // localOverride (enabled: true) should win — controller.init() must be called
      expect(jest.mocked(controller.init)).toHaveBeenCalledTimes(1);
    });

    it('logs an error when the stateChange callback throws', async () => {
      const error = new Error('mock error');
      jest.mocked(isMoneyAccountEnabled).mockImplementation(() => {
        throw error;
      });

      const { requestMock, baseMessenger } = buildStateChangeSetup();
      moneyAccountControllerInit(requestMock);

      publishStateChange(baseMessenger);
      await Promise.resolve();

      expect(jest.mocked(Logger.error)).toHaveBeenCalledWith(
        error,
        'MoneyAccountController: error handling RemoteFeatureFlagController state change',
      );
    });
  });
});
