/**
 * Mobile Infrastructure Adapter
 *
 * Provides mobile-specific implementations of PerpsPlatformDependencies.
 * Controller access uses messenger pattern (messenger.call()).
 */

import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import type { IMetaMetrics } from '../../../../core/Analytics/MetaMetrics.types';
import { trace, endTrace, TraceName } from '../../../../util/trace';
import { setMeasurement } from '@sentry/react-native';
import performance from 'react-native-performance';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import Engine from '../../../../core/Engine';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import type {
  PerpsPlatformDependencies,
  PerpsMetrics,
  PerpsTraceName,
  PerpsTraceValue,
  PerpsAnalyticsEvent,
  PerpsAnalyticsProperties,
  InvalidateCacheParams,
} from '../controllers/types';

/**
 * Type conversion helper - isolated cast for platform bridge.
 * PerpsTraceName values are string literals that match TraceName enum values.
 */
function toTraceName(name: PerpsTraceName): TraceName {
  return name as unknown as TraceName;
}

/**
 * Creates a mobile-specific MetaMetrics adapter that implements PerpsMetrics
 */
function createMobileMetrics(): PerpsMetrics {
  const metricsInstance: IMetaMetrics = MetaMetrics.getInstance();

  return {
    isEnabled(): boolean {
      return metricsInstance.isEnabled();
    },
    trackPerpsEvent(
      event: PerpsAnalyticsEvent,
      properties: PerpsAnalyticsProperties,
    ): void {
      // Find matching MetaMetricsEvents entry by name value
      // PerpsAnalyticsEvent enum values are the actual event names (e.g., 'Perp Withdrawal Transaction')
      const metaMetricsEvent = Object.values(MetaMetricsEvents).find(
        (e) =>
          typeof e === 'object' &&
          e !== null &&
          'name' in e &&
          e.name === event,
      );

      if (metaMetricsEvent && typeof metaMetricsEvent === 'object') {
        // Use MetricsEventBuilder for proper event construction
        const eventBuilder =
          MetricsEventBuilder.createEventBuilder(
            metaMetricsEvent,
          ).addProperties(properties);
        metricsInstance.trackEvent(eventBuilder.build(), true);
      } else {
        // Fallback: log warning and track with a generic Perps event
        // This shouldn't happen if PerpsAnalyticsEvent values match MetaMetricsEvents
        DevLogger.log(
          `PerpsAnalyticsEvent "${event}" not found in MetaMetricsEvents`,
        );
        // Create a proper tracking event using MetricsEventBuilder
        // Use event name as category to match generateOpt pattern in MetaMetrics.events.ts
        const fallbackEvent = MetricsEventBuilder.createEventBuilder({
          category: event,
        }).addProperties(properties);
        metricsInstance.trackEvent(fallbackEvent.build(), true);
      }
    },
  };
}

/**
 * Creates a stream manager adapter for pause/resume operations.
 * Maps channel names to the actual channel objects on PerpsStreamManager.
 */
function createStreamManagerAdapter() {
  return {
    pauseChannel(channel: string): void {
      const streamManager = getStreamManagerInstance();
      if (streamManager) {
        // Access the channel by name and call pause on it
        const channelInstance =
          streamManager[channel as keyof typeof streamManager];
        if (
          channelInstance &&
          typeof channelInstance === 'object' &&
          'pause' in channelInstance
        ) {
          (channelInstance as { pause: () => void }).pause();
        }
      }
    },
    resumeChannel(channel: string): void {
      const streamManager = getStreamManagerInstance();
      if (streamManager) {
        // Access the channel by name and call resume on it
        const channelInstance =
          streamManager[channel as keyof typeof streamManager];
        if (
          channelInstance &&
          typeof channelInstance === 'object' &&
          'resume' in channelInstance
        ) {
          (channelInstance as { resume: () => void }).resume();
        }
      }
    },
    clearAllChannels(): void {
      const streamManager = getStreamManagerInstance();
      if (
        streamManager &&
        typeof streamManager.clearAllChannels === 'function'
      ) {
        streamManager.clearAllChannels();
      }
    },
  };
}

/**
 * Creates a cache invalidator adapter that delegates to the mobile singleton.
 * This allows controller services to invalidate caches without direct dependency
 * on the mobile-specific PerpsCacheInvalidator singleton.
 */
function createCacheInvalidatorAdapter() {
  return {
    invalidate({ cacheType }: InvalidateCacheParams): void {
      PerpsCacheInvalidator.invalidate(cacheType);
    },
    invalidateAll(): void {
      PerpsCacheInvalidator.invalidateAll();
    },
  };
}

/**
 * Creates mobile-specific platform dependencies for PerpsController.
 * Controller access uses messenger pattern (messenger.call()).
 */
export function createMobileInfrastructure(): PerpsPlatformDependencies {
  return {
    // === Observability (stateless utilities) ===
    logger: {
      error(
        error: Error,
        options?: {
          tags?: Record<string, string | number>;
          context?: { name: string; data: Record<string, unknown> };
          extras?: Record<string, unknown>;
        },
      ): void {
        // Logger.error expects (error, context) format
        Logger.error(error, options?.context ?? options);
      },
    },
    debugLogger: {
      log(...args: unknown[]): void {
        DevLogger.log(...args);
      },
    },
    metrics: createMobileMetrics(),
    performance: {
      now(): number {
        return performance.now();
      },
    },
    tracer: {
      trace(params: {
        name: PerpsTraceName;
        id: string;
        op: string;
        tags?: Record<string, PerpsTraceValue>;
        data?: Record<string, PerpsTraceValue>;
      }): void {
        trace({
          name: toTraceName(params.name),
          id: params.id,
          op: params.op,
          tags: params.tags,
          data: params.data,
        });
      },
      endTrace(params: {
        name: PerpsTraceName;
        id: string;
        data?: Record<string, PerpsTraceValue>;
      }): void {
        endTrace({
          name: toTraceName(params.name),
          id: params.id,
          data: params.data,
        });
      },
      setMeasurement(name: string, value: number, unit: string): void {
        setMeasurement(name, value, unit);
      },
    },

    // === Platform Services ===
    streamManager: createStreamManagerAdapter(),

    // === Rewards ===
    rewards: {
      getFeeDiscount: (caipAccountId: `${string}:${string}:${string}`) =>
        Engine.context.RewardsController.getPerpsDiscountForAccount(
          caipAccountId,
        ),
    },

    // === Cache Invalidation ===
    cacheInvalidator: createCacheInvalidatorAdapter(),
  };
}
