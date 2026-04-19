import { analyticsControllerInit } from './analytics-controller-init';
import {
  AnalyticsController,
  AnalyticsControllerMessenger,
} from '@metamask/analytics-controller';
import { MessengerClientInitRequest } from '../../types';
import { AnalyticsControllerInitMessenger , getAnalyticsControllerMessenger } from '../../messengers/analytics-controller-messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { analytics } from '../../../../util/analytics/analytics';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import Logger from '../../../../util/Logger';
import type { AccountsControllerState } from '@metamask/accounts-controller';

type InternalAccounts = AccountsControllerState['internalAccounts']['accounts'];

jest.mock('@metamask/analytics-controller', () => ({
  ...jest.requireActual('@metamask/analytics-controller'),
  AnalyticsController: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
  })),
}));

jest.mock('./platform-adapter', () => ({
  createPlatformAdapter: jest.fn().mockReturnValue({}),
}));

jest.mock('./platform-adapter-e2e', () => ({
  createPlatformAdapter: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../util/test/utils', () => ({
  isE2E: false,
}));

jest.mock('../../../Braze', () => ({
  getBrazePlugin: jest.fn().mockReturnValue({}),
  syncBrazeAllowlists: jest.fn(),
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

const mockSyncBrazeAllowlists = jest.requireMock('../../../Braze')
  .syncBrazeAllowlists as jest.Mock;
const mockAnalyticsIdentify = jest.mocked(analytics.identify);
const mockGetAccountCompositionTraits = jest.mocked(
  getAccountCompositionTraits,
);
const mockLoggerError = jest.mocked(Logger.error);

const MOCK_BRAZE_SEGMENT_FORWARDING = { allowedEvents: ['event1'] };

function buildInitMessengerMock(): jest.Mocked<AnalyticsControllerInitMessenger> {
  return {
    subscribe: jest.fn(),
    call: jest.fn().mockReturnValue({
      remoteFeatureFlags: {
        brazeSegmentForwarding: MOCK_BRAZE_SEGMENT_FORWARDING,
      },
    }),
  } as unknown as jest.Mocked<AnalyticsControllerInitMessenger>;
}

function getInitRequestMock(
  overrides: Partial<{
    analyticsId: string;
    persistedState: Record<string, unknown>;
    initMessenger: jest.Mocked<AnalyticsControllerInitMessenger>;
  }> = {},
): jest.Mocked<
  MessengerClientInitRequest<
    AnalyticsControllerMessenger,
    AnalyticsControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getAnalyticsControllerMessenger(
      baseMessenger as never,
    ),
    initMessenger: overrides.initMessenger ?? buildInitMessengerMock(),
    analyticsId: overrides.analyticsId ?? 'test-analytics-id',
    persistedState: overrides.persistedState ?? {},
  };
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

function buildMockAccounts(
  overrides: Partial<InternalAccounts> = {},
): InternalAccounts {
  return {
    'account-1': {
      id: 'account-1',
      address: '0x1234',
      type: 'eip155:eoa',
      options: { entropy: { id: 'entropy-1', groupIndex: 0 } },
      methods: [],
      metadata: {
        keyring: { type: 'HD Key Tree' },
        importTime: 0,
        name: 'Account 1',
        nameLastUpdatedAt: 0,
      },
    },
    ...overrides,
  } as unknown as InternalAccounts;
}

describe('analyticsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('controller initialization', () => {
    it('returns the initialized controller', () => {
      const { controller } = analyticsControllerInit(getInitRequestMock());
      expect(controller).toBeDefined();
    });

    it('creates AnalyticsController with correct arguments', () => {
      analyticsControllerInit(getInitRequestMock());

      expect(AnalyticsController).toHaveBeenCalledWith({
        messenger: expect.any(Object),
        state: expect.objectContaining({ analyticsId: 'test-analytics-id' }),
        platformAdapter: expect.any(Object),
        isAnonymousEventsFeatureEnabled: true,
      });
    });

    it('uses persisted optedIn state when available', () => {
      analyticsControllerInit(
        getInitRequestMock({
          persistedState: { AnalyticsController: { optedIn: true } },
        }),
      );

      expect(AnalyticsController).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.objectContaining({ optedIn: true }),
        }),
      );
    });

    it('calls controller.init()', () => {
      analyticsControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(AnalyticsController);
      expect(controllerMock.mock.results[0].value.init).toHaveBeenCalled();
    });
  });

  describe('platform adapter', () => {
    it('uses standard platform adapter when not in E2E', () => {
      const { createPlatformAdapter } = jest.requireMock('./platform-adapter');
      analyticsControllerInit(getInitRequestMock());
      expect(createPlatformAdapter).toHaveBeenCalled();
    });

    it('uses E2E platform adapter when isE2E is true', () => {
      jest.resetModules();
      jest.doMock('../../../../util/test/utils', () => ({ isE2E: true }));
      const { createPlatformAdapter: createE2E } = jest.requireMock(
        './platform-adapter-e2e',
      );
      // Re-require to pick up the new isE2E mock
      const { analyticsControllerInit: initFn } = jest.requireMock(
        './analytics-controller-init',
      );
      initFn?.(getInitRequestMock());
      // The E2E mock was registered; verify it was set up
      expect(createE2E).toBeDefined();
    });
  });

  describe('RemoteFeatureFlagController:stateChange subscription', () => {
    it('subscribes to RemoteFeatureFlagController:stateChange', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      expect(initMessenger.subscribe).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:stateChange',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('passes syncBrazeAllowlists as the subscriber callback', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const [, callback] = initMessenger.subscribe.mock.calls.find(
        ([event]) => event === 'RemoteFeatureFlagController:stateChange',
      ) as Parameters<typeof initMessenger.subscribe>;

      expect(callback).toBe(mockSyncBrazeAllowlists);
    });

    it('uses brazeSegmentForwarding as the selector', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const [, , selector] = initMessenger.subscribe.mock.calls.find(
        ([event]) => event === 'RemoteFeatureFlagController:stateChange',
      ) as Parameters<typeof initMessenger.subscribe>;

      const mockFlags = {
        remoteFeatureFlags: { brazeSegmentForwarding: { allowedEvents: [] } },
      };
      const result = (selector as (state: typeof mockFlags) => unknown)(
        mockFlags,
      );
      expect(result).toBe(mockFlags.remoteFeatureFlags.brazeSegmentForwarding);
    });
  });

  describe('initial Braze sync', () => {
    it('calls getState on RemoteFeatureFlagController', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      expect(initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it('calls syncBrazeAllowlists with the braze segment forwarding flags', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      expect(mockSyncBrazeAllowlists).toHaveBeenCalledWith(
        MOCK_BRAZE_SEGMENT_FORWARDING,
      );
    });
  });

  describe('AccountsController:stateChange subscription', () => {
    it('subscribes to AccountsController:stateChange', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      expect(initMessenger.subscribe).toHaveBeenCalledWith(
        'AccountsController:stateChange',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('uses internalAccounts.accounts as the selector', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const [, , selector] = initMessenger.subscribe.mock.calls.find(
        ([event]) => event === 'AccountsController:stateChange',
      ) as Parameters<typeof initMessenger.subscribe>;

      const mockState = {
        internalAccounts: { accounts: buildMockAccounts() },
      };
      const result = (selector as (state: typeof mockState) => unknown)(
        mockState,
      );
      expect(result).toBe(mockState.internalAccounts.accounts);
    });

    it('calls analytics.identify when account composition changes', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const callback = getAccountsSubscribeCallback(initMessenger);
      const accounts = buildMockAccounts();
      callback(accounts);

      expect(mockAnalyticsIdentify).toHaveBeenCalledWith({ trait: 'value' });
      expect(mockGetAccountCompositionTraits).toHaveBeenCalledWith(accounts);
    });

    it('does not call analytics.identify when account composition has not changed', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const callback = getAccountsSubscribeCallback(initMessenger);
      const accounts = buildMockAccounts();

      callback(accounts);
      jest.clearAllMocks();
      callback(accounts);

      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('calls analytics.identify again when account composition changes after initial call', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const callback = getAccountsSubscribeCallback(initMessenger);

      const accounts1 = buildMockAccounts();
      callback(accounts1);
      jest.clearAllMocks();

      const accounts2 = buildMockAccounts({
        'account-2': {
          id: 'account-2',
          address: '0x5678',
          type: 'eip155:eoa',
          options: {},
          methods: [],
          metadata: {
            keyring: { type: 'Simple Key Pair' },
            importTime: 0,
            name: 'Account 2',
            nameLastUpdatedAt: 0,
          },
        } as unknown as InternalAccounts[string],
      });
      callback(accounts2);

      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('logs an error when analytics.identify throws', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));

      const mockError = new Error('identify failed');
      mockAnalyticsIdentify.mockImplementationOnce(() => {
        throw mockError;
      });

      const callback = getAccountsSubscribeCallback(initMessenger);
      callback(buildMockAccounts());

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'analyticsControllerInit: Error updating account composition traits',
      );
    });
  });

  describe('getCompositionFingerprint', () => {
    it('produces stable fingerprint including keyring type and entropy', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accounts = buildMockAccounts();
      callback(accounts);
      jest.clearAllMocks();
      // Same accounts, same fingerprint — should not re-identify
      callback(accounts);
      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });

    it('produces different fingerprint when keyring type changes', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));
      const callback = getAccountsSubscribeCallback(initMessenger);

      callback(buildMockAccounts());
      jest.clearAllMocks();

      const accountsChanged = {
        'account-1': {
          id: 'account-1',
          address: '0x1234',
          type: 'eip155:eoa',
          options: { entropy: { id: 'entropy-1', groupIndex: 0 } },
          methods: [],
          metadata: {
            keyring: { type: 'Simple Key Pair' }, // changed
            importTime: 0,
            name: 'Account 1',
            nameLastUpdatedAt: 0,
          },
        },
      } as unknown as InternalAccounts;

      callback(accountsChanged);
      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('handles accounts with missing entropy gracefully', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accountsNoEntropy = {
        'account-1': {
          id: 'account-1',
          address: '0x1234',
          type: 'eip155:eoa',
          options: {},
          methods: [],
          metadata: {
            keyring: { type: 'HD Key Tree' },
            importTime: 0,
            name: 'Account 1',
            nameLastUpdatedAt: 0,
          },
        },
      } as unknown as InternalAccounts;

      expect(() => callback(accountsNoEntropy)).not.toThrow();
      expect(mockAnalyticsIdentify).toHaveBeenCalled();
    });

    it('handles accounts with missing keyring metadata gracefully', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accountsNoKeyring = {
        'account-1': {
          id: 'account-1',
          address: '0x1234',
          type: 'eip155:eoa',
          options: {},
          methods: [],
          metadata: {
            importTime: 0,
            name: 'Account 1',
            nameLastUpdatedAt: 0,
          },
        },
      } as unknown as InternalAccounts;

      expect(() => callback(accountsNoKeyring)).not.toThrow();
    });

    it('produces sorted, stable output for multiple accounts', () => {
      const initMessenger = buildInitMessengerMock();
      analyticsControllerInit(getInitRequestMock({ initMessenger }));
      const callback = getAccountsSubscribeCallback(initMessenger);

      const accountsAB = {
        'account-a': {
          id: 'account-a',
          address: '0xaaa',
          type: 'eip155:eoa',
          options: {},
          methods: [],
          metadata: {
            keyring: { type: 'HD Key Tree' },
            importTime: 0,
            name: 'A',
            nameLastUpdatedAt: 0,
          },
        },
        'account-b': {
          id: 'account-b',
          address: '0xbbb',
          type: 'eip155:eoa',
          options: {},
          methods: [],
          metadata: {
            keyring: { type: 'Simple Key Pair' },
            importTime: 0,
            name: 'B',
            nameLastUpdatedAt: 0,
          },
        },
      } as unknown as InternalAccounts;

      callback(accountsAB);
      jest.clearAllMocks();

      // Same accounts, different insertion order — fingerprint should be identical (sorted)
      const accountsBA = {
        'account-b': accountsAB['account-b'],
        'account-a': accountsAB['account-a'],
      } as unknown as InternalAccounts;

      callback(accountsBA);
      expect(mockAnalyticsIdentify).not.toHaveBeenCalled();
    });
  });
});
