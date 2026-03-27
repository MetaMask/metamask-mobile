import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
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
  __esModule: true,
  default: {
    error: jest.fn(),
  },
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

jest.mock('../../../../core/Engine', () => ({
  context: {
    RewardsController: {
      getPerpsDiscountForAccount: jest.fn().mockResolvedValue(5),
    },
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

  describe('logger', () => {
    it('preserves logger options and injects the perps feature tag', () => {
      const infra = createMobileInfrastructure();
      const error = new Error('boom');

      infra.logger.error(error, {
        tags: { component: 'test_component' },
        context: {
          name: 'test_context',
          data: { foo: 'bar' },
        },
        extras: { traceId: '123' },
      });

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: expect.any(String),
            component: 'test_component',
          }),
          context: {
            name: 'test_context',
            data: { foo: 'bar' },
          },
          extras: { traceId: '123' },
        }),
      );
    });
  });

  describe('rewards', () => {
    it('delegates getPerpsDiscountForAccount to RewardsController', async () => {
      const infra = createMobileInfrastructure();
      const caipAccountId =
        'eip155:42161:0x1234' as `${string}:${string}:${string}`;

      const result =
        await infra.rewards.getPerpsDiscountForAccount(caipAccountId);

      expect(
        Engine.context.RewardsController.getPerpsDiscountForAccount,
      ).toHaveBeenCalledWith(caipAccountId);
      expect(result).toBe(5);
    });
  });
});
