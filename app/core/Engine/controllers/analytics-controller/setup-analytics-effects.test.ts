import type { AccountsControllerState } from '@metamask/accounts-controller';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import { syncBrazeEventBlocklist } from '../../../Braze';
import { BRAZE_EVENT_BLOCKLIST_FLAG_KEY } from '../../../../selectors/featureFlagController/brazeEventBlocklist';
import type { AnalyticsControllerInitMessenger } from '../../messengers/analytics-controller-messenger';
import { setupAnalyticsControllerEffects } from './setup-analytics-effects';

type InternalAccounts = AccountsControllerState['internalAccounts']['accounts'];

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

jest.mock('../../../Braze', () => ({
  syncBrazeEventBlocklist: jest.fn(),
}));

const mockAnalyticsIdentify = jest.mocked(analytics.identify);
const mockGetAccountCompositionTraits = jest.mocked(
  getAccountCompositionTraits,
);
const mockLoggerError = jest.mocked(Logger.error);
const mockSyncBrazeEventBlocklist = jest.mocked(syncBrazeEventBlocklist);

function buildInitMessengerMock(): jest.Mocked<AnalyticsControllerInitMessenger> {
  return {
    subscribe: jest.fn(),
    call: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsControllerInitMessenger>;
}

function getAccountsSubscribeCallback(
  initMessengerMock: jest.Mocked<AnalyticsControllerInitMessenger>,
): (accounts: InternalAccounts) => void {
  const subscribeCall = initMessengerMock.subscribe.mock.calls.find(
    ([event]) => event === 'AccountsController:stateChange',
  );
  if (!subscribeCall) throw new Error('AccountsController subscribe not found');
  return subscribeCall[1] as (accounts: InternalAccounts) => void;
}

function getRemoteFeatureFlagSubscribeCallback(
  initMessengerMock: jest.Mocked<AnalyticsControllerInitMessenger>,
): (state: RemoteFeatureFlagControllerState) => void {
  const subscribeCall = initMessengerMock.subscribe.mock.calls.find(
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

describe('setupAnalyticsControllerEffects', () => {
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
      const initMessenger = buildInitMessengerMock();
      initMessenger.call.mockReturnValue(
        buildRemoteFeatureFlagState({
          [BRAZE_EVENT_BLOCKLIST_FLAG_KEY]: flagValue,
        }),
      );

      setupAnalyticsControllerEffects(initMessenger);

      expect(initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
      expect(mockSyncBrazeEventBlocklist).toHaveBeenCalledWith(flagValue);
    });

    it('subscribes to RemoteFeatureFlagController:stateChange', () => {
      const initMessenger = buildInitMessengerMock();

      setupAnalyticsControllerEffects(initMessenger);

      expect(initMessenger.subscribe).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:stateChange',
        expect.any(Function),
      );
    });

    it('syncs the blocklist when remote feature flags change', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      mockSyncBrazeEventBlocklist.mockClear();

      const callback = getRemoteFeatureFlagSubscribeCallback(initMessenger);
      callback(
        buildRemoteFeatureFlagState({
          [BRAZE_EVENT_BLOCKLIST_FLAG_KEY]: flagValue,
        }),
      );

      expect(mockSyncBrazeEventBlocklist).toHaveBeenCalledWith(flagValue);
    });
  });

  describe('AccountsController:stateChange subscription', () => {
    it('subscribes to AccountsController:stateChange', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      expect(initMessenger.subscribe).toHaveBeenCalledWith(
        'AccountsController:stateChange',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('uses internalAccounts.accounts as the selector', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      const [, , selector] = initMessenger.subscribe.mock.calls.find(
        ([event]) => event === 'AccountsController:stateChange',
      ) as Parameters<typeof initMessenger.subscribe>;

      const mockState = {
        internalAccounts: { accounts: buildMockAccounts() },
      };
      const result = (
        selector as unknown as (state: typeof mockState) => unknown
      )(mockState);
      expect(result).toBe(mockState.internalAccounts.accounts);
    });

    it('calls analytics.identify when account composition changes', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      const callback = getAccountsSubscribeCallback(initMessenger);
      const accounts = buildMockAccounts();
      callback(accounts);

      expect(mockAnalyticsIdentify).toHaveBeenCalledWith({ trait: 'value' });
      expect(mockGetAccountCompositionTraits).toHaveBeenCalledWith(accounts);
    });

    it('does not call analytics.identify when account composition has not changed', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      const callback = getAccountsSubscribeCallback(initMessenger);
      const accounts = buildMockAccounts();

      callback(accounts);
      jest.clearAllMocks();
      callback(accounts);

      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('calls analytics.identify again when account composition changes after the first call', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      const callback = getAccountsSubscribeCallback(initMessenger);

      callback(buildMockAccounts());
      jest.clearAllMocks();

      const accounts2 = buildMockAccounts({
        'account-2': {
          ...createMockInternalAccount(
            '0x5678',
            'Account 2',
            KeyringTypes.simple,
          ),
          id: 'account-2',
        },
      });
      callback(accounts2);

      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('logs an error when analytics.identify throws', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);

      const mockError = new Error('identify failed');
      mockAnalyticsIdentify.mockImplementationOnce(() => {
        throw mockError;
      });

      const callback = getAccountsSubscribeCallback(initMessenger);
      callback(buildMockAccounts());

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'setupAnalyticsControllerEffects: Error updating account composition traits',
      );
    });

    it('keeps the same fingerprint when keyring type and entropy are unchanged', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accounts = buildMockAccounts();
      callback(accounts);
      jest.clearAllMocks();
      callback(accounts);
      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('calls analytics.identify when the keyring type changes', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      const callback = getAccountsSubscribeCallback(initMessenger);

      callback(buildMockAccounts());
      jest.clearAllMocks();

      const accountsChanged: InternalAccounts = {
        'account-1': {
          ...createMockInternalAccount(
            '0x1234',
            'Account 1',
            KeyringTypes.simple,
          ),
          id: 'account-1',
        },
      };

      callback(accountsChanged);
      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('identifies accounts that have no entropy', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accountsNoEntropy: InternalAccounts = {
        'account-1': {
          ...createMockInternalAccount('0x1234', 'Account 1', KeyringTypes.hd),
          id: 'account-1',
        },
      };

      expect(() => callback(accountsNoEntropy)).not.toThrow();
      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('identifies accounts that have no keyring metadata', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accountsNoKeyring: InternalAccounts = {
        'account-1': {
          ...createMockInternalAccount('0x1234', 'Account 1', KeyringTypes.hd),
          id: 'account-1',
          metadata: {
            importTime: 0,
            name: 'Account 1',
          } as InternalAccount['metadata'],
        },
      };

      expect(() => callback(accountsNoKeyring)).not.toThrow();
    });

    it('treats account insertion order as the same composition', () => {
      const initMessenger = buildInitMessengerMock();
      setupAnalyticsControllerEffects(initMessenger);
      const callback = getAccountsSubscribeCallback(initMessenger);

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

      const accountsBA: InternalAccounts = {
        'account-b': accountsAB['account-b'],
        'account-a': accountsAB['account-a'],
      };

      callback(accountsBA);
      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });
  });
});
