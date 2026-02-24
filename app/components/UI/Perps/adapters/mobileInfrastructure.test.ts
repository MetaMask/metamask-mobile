import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import type { PerpsAnalyticsEvent } from '@metamask/perps-controller';
import { createMobileInfrastructure } from './mobileInfrastructure';
import Engine from '../../../../core/Engine';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    PERPS_UI_INTERACTION: {
      category: 'Perp UI Interaction',
      name: 'Perp UI Interaction',
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {},
}));

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 123),
}));

jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: jest.fn(),
}));

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      state: { selectedNetworkClientId: 'mainnet' },
      getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x1' }),
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    KeyringController: {
      state: { isUnlocked: true },
      signTypedMessage: jest.fn().mockResolvedValue('0xsignature'),
    },
    TransactionController: {
      addTransaction: jest
        .fn()
        .mockResolvedValue({ transactionMeta: { id: 'tx-1' } }),
    },
    RemoteFeatureFlagController: {
      state: { remoteFeatureFlags: { perpsEnabled: true } },
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue(['0xabc']),
    },
    AuthenticationController: {
      getBearerToken: jest.fn().mockResolvedValue('bearer-token-123'),
    },
    RewardsController: {
      getPerpsDiscountForAccount: jest.fn().mockResolvedValue({ discount: 5 }),
    },
  },
  controllerMessenger: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
  },
}));

jest.mock('../services/PerpsCacheInvalidator', () => ({
  PerpsCacheInvalidator: {
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  },
}));

jest.mock('../../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

jest.mock('../utils/formatUtils', () => ({
  formatVolume: jest.fn(),
  formatPerpsFiat: jest.fn(),
  PRICE_RANGES_UNIVERSAL: [],
}));

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(() => ({
    format: jest.fn((v: number) => `${v}%`),
  })),
}));

describe('createMobileInfrastructure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metrics', () => {
    it('delegates isEnabled to analytics.isEnabled', () => {
      jest.mocked(analytics.isEnabled).mockReturnValue(true);
      const infra = createMobileInfrastructure();

      expect(infra.metrics.isEnabled()).toBe(true);
      expect(analytics.isEnabled).toHaveBeenCalled();
    });

    it('returns false when analytics is disabled', () => {
      jest.mocked(analytics.isEnabled).mockReturnValue(false);
      const infra = createMobileInfrastructure();

      expect(infra.metrics.isEnabled()).toBe(false);
    });

    it('tracks event using AnalyticsEventBuilder when event matches MetaMetricsEvents', () => {
      const mockBuild = jest.fn().mockReturnValue({ name: 'built-event' });
      const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
      jest.mocked(AnalyticsEventBuilder.createEventBuilder).mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      } as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >);

      const infra = createMobileInfrastructure();
      const properties = { key: 'value' };

      infra.metrics.trackPerpsEvent(
        'Perp UI Interaction' as PerpsAnalyticsEvent,
        properties,
      );

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(properties);
      expect(mockBuild).toHaveBeenCalled();
      expect(analytics.trackEvent).toHaveBeenCalledWith({
        name: 'built-event',
      });
    });

    it('uses fallback category-based event when event name is not found in MetaMetricsEvents', () => {
      const mockBuild = jest.fn().mockReturnValue({ name: 'fallback-event' });
      const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
      jest.mocked(AnalyticsEventBuilder.createEventBuilder).mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      } as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >);

      const infra = createMobileInfrastructure();
      const properties = { action: 'test' };

      infra.metrics.trackPerpsEvent(
        'Unknown Perps Event' as PerpsAnalyticsEvent,
        properties,
      );

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith({
        category: 'Unknown Perps Event',
      });
      expect(mockAddProperties).toHaveBeenCalledWith(properties);
      expect(analytics.trackEvent).toHaveBeenCalledWith({
        name: 'fallback-event',
      });
    });
  });

  describe('controllers', () => {
    describe('network', () => {
      it('delegates getState to NetworkController.state', () => {
        const infra = createMobileInfrastructure();

        const state = infra.controllers.network.getState();

        expect(state).toEqual({ selectedNetworkClientId: 'mainnet' });
      });

      it('delegates getNetworkClientById to NetworkController', () => {
        const infra = createMobileInfrastructure();

        const client =
          infra.controllers.network.getNetworkClientById('mainnet');

        expect(
          Engine.context.NetworkController.getNetworkClientById,
        ).toHaveBeenCalledWith('mainnet');
        expect(client).toEqual({ chainId: '0x1' });
      });

      it('delegates findNetworkClientIdByChainId to NetworkController', () => {
        const infra = createMobileInfrastructure();

        const clientId =
          infra.controllers.network.findNetworkClientIdByChainId('0xa4b1');

        expect(
          Engine.context.NetworkController.findNetworkClientIdByChainId,
        ).toHaveBeenCalledWith('0xa4b1');
        expect(clientId).toBe('mainnet');
      });
    });

    describe('keyring', () => {
      it('delegates getState to KeyringController.state', () => {
        const infra = createMobileInfrastructure();

        const state = infra.controllers.keyring.getState();

        expect(state).toEqual({ isUnlocked: true });
      });

      it('delegates signTypedMessage to KeyringController', async () => {
        const infra = createMobileInfrastructure();
        const params = { data: '0xdata', from: '0xaddr' };

        const result = await infra.controllers.keyring.signTypedMessage(
          params as Parameters<
            typeof Engine.context.KeyringController.signTypedMessage
          >[0],
          'V4',
        );

        expect(
          Engine.context.KeyringController.signTypedMessage,
        ).toHaveBeenCalledWith(params, 'V4');
        expect(result).toBe('0xsignature');
      });
    });

    describe('transaction', () => {
      it('delegates addTransaction to TransactionController', async () => {
        const infra = createMobileInfrastructure();
        const txParams = { to: '0xrecipient', value: '0x0' };
        const opts = { origin: 'perps' };

        const result = await infra.controllers.transaction.addTransaction(
          txParams as Parameters<
            typeof Engine.context.TransactionController.addTransaction
          >[0],
          opts as Parameters<
            typeof Engine.context.TransactionController.addTransaction
          >[1],
        );

        expect(
          Engine.context.TransactionController.addTransaction,
        ).toHaveBeenCalledWith(txParams, opts);
        expect(result).toEqual({ transactionMeta: { id: 'tx-1' } });
      });
    });

    describe('remoteFeatureFlags', () => {
      it('delegates getState to RemoteFeatureFlagController.state', () => {
        const infra = createMobileInfrastructure();

        const state = infra.controllers.remoteFeatureFlags.getState();

        expect(state).toEqual({
          remoteFeatureFlags: { perpsEnabled: true },
        });
      });

      it('subscribes to RemoteFeatureFlagController stateChange', () => {
        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        infra.controllers.remoteFeatureFlags.onStateChange(handler);

        expect(mockSubscribe).toHaveBeenCalledWith(
          'RemoteFeatureFlagController:stateChange',
          expect.any(Function),
        );
      });

      it('returns unsubscribe function that calls messenger.unsubscribe', () => {
        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        const unsubscribe =
          infra.controllers.remoteFeatureFlags.onStateChange(handler);
        unsubscribe();

        expect(mockUnsubscribe).toHaveBeenCalledWith(
          'RemoteFeatureFlagController:stateChange',
          expect.any(Function),
        );
      });

      it('defers subscription to next tick when Engine throws', () => {
        jest.useFakeTimers();
        mockSubscribe.mockImplementationOnce(() => {
          throw new Error('Engine not ready');
        });

        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        infra.controllers.remoteFeatureFlags.onStateChange(handler);

        expect(mockSubscribe).toHaveBeenCalledTimes(1);

        jest.runAllTimers();

        expect(mockSubscribe).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
      });

      it('unsubscribe silently ignores errors when Engine is unavailable', () => {
        mockUnsubscribe.mockImplementationOnce(() => {
          throw new Error('Engine not available');
        });

        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        const unsubscribe =
          infra.controllers.remoteFeatureFlags.onStateChange(handler);

        expect(() => unsubscribe()).not.toThrow();
      });
    });

    describe('accountTree', () => {
      it('delegates getAccountsFromSelectedGroup to AccountTreeController', () => {
        const infra = createMobileInfrastructure();

        const accounts =
          infra.controllers.accountTree.getAccountsFromSelectedGroup();

        expect(
          Engine.context.AccountTreeController
            .getAccountsFromSelectedAccountGroup,
        ).toHaveBeenCalled();
        expect(accounts).toEqual(['0xabc']);
      });

      it('subscribes to AccountTreeController selectedAccountGroupChange', () => {
        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        infra.controllers.accountTree.onSelectedAccountGroupChange(handler);

        expect(mockSubscribe).toHaveBeenCalledWith(
          'AccountTreeController:selectedAccountGroupChange',
          expect.any(Function),
        );
      });

      it('returns unsubscribe function for accountTree', () => {
        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        const unsubscribe =
          infra.controllers.accountTree.onSelectedAccountGroupChange(handler);
        unsubscribe();

        expect(mockUnsubscribe).toHaveBeenCalledWith(
          'AccountTreeController:selectedAccountGroupChange',
          expect.any(Function),
        );
      });

      it('defers accountTree subscription to next tick when Engine throws', () => {
        jest.useFakeTimers();
        mockSubscribe.mockImplementationOnce(() => {
          throw new Error('Engine not ready');
        });

        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        infra.controllers.accountTree.onSelectedAccountGroupChange(handler);

        jest.runAllTimers();

        expect(mockSubscribe).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
      });

      it('accountTree unsubscribe silently ignores errors', () => {
        mockUnsubscribe.mockImplementationOnce(() => {
          throw new Error('Engine not available');
        });

        const infra = createMobileInfrastructure();
        const handler = jest.fn();

        const unsubscribe =
          infra.controllers.accountTree.onSelectedAccountGroupChange(handler);

        expect(() => unsubscribe()).not.toThrow();
      });
    });

    describe('authentication', () => {
      it('delegates getBearerToken to AuthenticationController', async () => {
        const infra = createMobileInfrastructure();

        const token = await infra.controllers.authentication.getBearerToken();

        expect(
          Engine.context.AuthenticationController.getBearerToken,
        ).toHaveBeenCalled();
        expect(token).toBe('bearer-token-123');
      });
    });

    describe('rewards', () => {
      it('delegates getPerpsDiscountForAccount to RewardsController', async () => {
        const infra = createMobileInfrastructure();
        const caipAccountId =
          'eip155:42161:0x1234' as `${string}:${string}:${string}`;

        const result =
          await infra.controllers.rewards.getPerpsDiscountForAccount(
            caipAccountId,
          );

        expect(
          Engine.context.RewardsController.getPerpsDiscountForAccount,
        ).toHaveBeenCalledWith(caipAccountId);
        expect(result).toEqual({ discount: 5 });
      });
    });
  });
});
