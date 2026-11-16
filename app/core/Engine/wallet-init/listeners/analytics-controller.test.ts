import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { setupAnalyticsControllerListeners } from './analytics-controller';
import type { AnalyticsControllerInitMessenger } from '../messengers/analytics-controller-messenger';
import { analytics } from '../../../../util/analytics/analytics';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import Logger from '../../../../util/Logger';
import { syncBrazeEventBlocklist } from '../../../Braze';
import { BRAZE_EVENT_BLOCKLIST_FLAG_KEY } from '../../../../selectors/featureFlagController/brazeEventBlocklist';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';

type InternalAccounts = AccountsControllerState['internalAccounts']['accounts'];

jest.mock('../../../Braze', () => ({
  syncBrazeEventBlocklist: jest.fn(),
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
  },
}));

jest.mock(
  '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => ({
    getAccountCompositionTraits: jest.fn().mockReturnValue({ trait: 'value' }),
  }),
);

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockAnalyticsIdentify = jest.mocked(analytics.identify);
const mockGetAccountCompositionTraits = jest.mocked(
  getAccountCompositionTraits,
);
const mockLoggerError = jest.mocked(Logger.error);
const mockSyncBrazeEventBlocklist = jest.mocked(syncBrazeEventBlocklist);

function buildMessengerMock(): jest.Mocked<AnalyticsControllerInitMessenger> {
  return {
    subscribe: jest.fn(),
    call: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsControllerInitMessenger>;
}

function getAccountsSubscribeCallback(
  messenger: jest.Mocked<AnalyticsControllerInitMessenger>,
): (accounts: InternalAccounts) => void {
  const subscribeCall = messenger.subscribe.mock.calls.find(
    ([event]) => event === 'AccountsController:stateChange',
  );
  if (!subscribeCall) throw new Error('AccountsController subscribe not found');
  return subscribeCall[1] as (accounts: InternalAccounts) => void;
}

function getRemoteFeatureFlagSubscribeCallback(
  messenger: jest.Mocked<AnalyticsControllerInitMessenger>,
): (state: RemoteFeatureFlagControllerState) => void {
  const subscribeCall = messenger.subscribe.mock.calls.find(
    ([event]) => event === 'RemoteFeatureFlagController:stateChange',
  );
  if (!subscribeCall) {
    throw new Error('RemoteFeatureFlagController subscribe not found');
  }
  return subscribeCall[1] as (state: RemoteFeatureFlagControllerState) => void;
}

function buildRemoteFeatureFlagState(
  remoteFeatureFlags: RemoteFeatureFlagControllerState['remoteFeatureFlags'] = {},
): RemoteFeatureFlagControllerState {
  return {
    remoteFeatureFlags,
    localOverrides: {},
    cacheTimestamp: 0,
  };
}

function buildMockAccounts(
  overrides: Partial<InternalAccounts> = {},
): InternalAccounts {
  return {
    'account-1': {
      ...createMockInternalAccount('0x1234', 'Account 1', KeyringTypes.hd),
      id: 'account-1',
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: 'entropy-1',
          derivationPath: "m/44'/60'/0'/0/0",
          groupIndex: 0,
        },
      } as InternalAccount['options'],
    },
    ...overrides,
  };
}

describe('setupAnalyticsControllerListeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Braze event blocklist', () => {
    const flagValue = {
      enabled: true,
      minimumVersion: '8.14.0',
      blockedEvents: ['App Opened'],
    };

    it('syncs the current remote flag value on setup', () => {
      const messenger = buildMessengerMock();
      messenger.call.mockReturnValue(
        buildRemoteFeatureFlagState({
          [BRAZE_EVENT_BLOCKLIST_FLAG_KEY]: flagValue,
        }),
      );

      setupAnalyticsControllerListeners(messenger);

      expect(messenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
      expect(mockSyncBrazeEventBlocklist).toHaveBeenCalledWith(flagValue);
    });

    it('syncs the blocklist when remote feature flags change', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);
      mockSyncBrazeEventBlocklist.mockClear();

      const callback = getRemoteFeatureFlagSubscribeCallback(messenger);
      callback(
        buildRemoteFeatureFlagState({
          [BRAZE_EVENT_BLOCKLIST_FLAG_KEY]: flagValue,
        }),
      );

      expect(mockSyncBrazeEventBlocklist).toHaveBeenCalledWith(flagValue);
    });
  });

  describe('AccountsController:stateChange subscription', () => {
    it('uses internalAccounts.accounts as the selector', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);

      const [, , selector] = messenger.subscribe.mock.calls.find(
        ([event]) => event === 'AccountsController:stateChange',
      ) as Parameters<typeof messenger.subscribe>;

      const mockState = {
        internalAccounts: { accounts: buildMockAccounts() },
      };
      const result = (
        selector as unknown as (state: typeof mockState) => unknown
      )(mockState);
      expect(result).toBe(mockState.internalAccounts.accounts);
    });

    it('calls analytics.identify when account composition changes', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);

      const callback = getAccountsSubscribeCallback(messenger);
      const accounts = buildMockAccounts();
      callback(accounts);

      expect(mockAnalyticsIdentify).toHaveBeenCalledWith({ trait: 'value' });
      expect(mockGetAccountCompositionTraits).toHaveBeenCalledWith(accounts);
    });

    it('does not call analytics.identify when account composition has not changed', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);

      const callback = getAccountsSubscribeCallback(messenger);
      const accounts = buildMockAccounts();

      callback(accounts);
      jest.clearAllMocks();
      callback(accounts);

      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('calls analytics.identify again when the keyring type changes', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);
      const callback = getAccountsSubscribeCallback(messenger);

      callback(buildMockAccounts());
      jest.clearAllMocks();

      callback({
        'account-1': {
          ...createMockInternalAccount(
            '0x1234',
            'Account 1',
            KeyringTypes.simple,
          ),
          id: 'account-1',
        },
      });

      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('produces a stable fingerprint regardless of account order', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);
      const callback = getAccountsSubscribeCallback(messenger);

      const accountsAB: InternalAccounts = {
        'account-a': {
          ...createMockInternalAccount('0xaaa', 'A', KeyringTypes.hd),
          id: 'account-a',
        },
        'account-b': {
          ...createMockInternalAccount('0xbbb', 'B', KeyringTypes.simple),
          id: 'account-b',
        },
      };

      callback(accountsAB);
      jest.clearAllMocks();
      callback({
        'account-b': accountsAB['account-b'],
        'account-a': accountsAB['account-a'],
      });

      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('logs an error when analytics.identify throws', () => {
      const messenger = buildMessengerMock();
      setupAnalyticsControllerListeners(messenger);

      const mockError = new Error('identify failed');
      mockAnalyticsIdentify.mockImplementationOnce(() => {
        throw mockError;
      });

      const callback = getAccountsSubscribeCallback(messenger);
      callback(buildMockAccounts());

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'setupAnalyticsControllerListeners: Error updating account composition traits',
      );
    });
  });
});
