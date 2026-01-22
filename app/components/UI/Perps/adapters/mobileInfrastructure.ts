/**
 * Mobile Infrastructure Adapter
 *
 * Provides platform-specific implementations of IPerpsPlatformDependencies interfaces
 * for the mobile app. This adapter wraps existing mobile utilities to allow
 * PerpsController and its services to remain platform-agnostic.
 *
 * When migrating to core monorepo:
 * - This file stays in the mobile app
 * - Core will have its own adapter or mock implementations
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
import { findEvmAccount } from '../utils/accountUtils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';
import Engine from '../../../../core/Engine';
import {
  SignTypedDataVersion,
  type TypedMessageParams,
  type PersonalMessageParams,
} from '@metamask/keyring-controller';
import { TransactionType } from '@metamask/transaction-controller';
import type {
  IPerpsPlatformDependencies,
  IPerpsMetrics,
  IPerpsControllerAccess,
  PerpsTraceName,
  PerpsTraceValue,
  PerpsAnalyticsEvent,
  PerpsAnalyticsProperties,
} from '../controllers/types';

/**
 * Type conversion helper - isolated cast for platform bridge.
 * PerpsTraceName values are string literals that match TraceName enum values.
 */
function toTraceName(name: PerpsTraceName): TraceName {
  return name as unknown as TraceName;
}

/**
 * Creates a mobile-specific MetaMetrics adapter that implements IPerpsMetrics
 */
function createMobileMetrics(): IPerpsMetrics {
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
  };
}

/**
 * Creates mobile-specific platform dependencies for PerpsController
 *
 * This function wraps all mobile-specific dependencies into a single
 * dependencies object that can be injected into PerpsController.
 *
 * @returns IPerpsPlatformDependencies - All platform dependencies bundled
 */
export function createMobileInfrastructure(): IPerpsPlatformDependencies {
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

    // === Controller Access (ALL controllers consolidated) ===
    controllers: createControllerAccessAdapter(),
  };
}

/**
 * Creates a consolidated controller access adapter that wraps Engine.context controllers.
 * This unified adapter provides ALL controller dependencies in one place.
 *
 * Architecture:
 * - accounts: AccountsController access (selected account, CAIP formatting)
 * - keyring: KeyringController (signing operations)
 * - network: NetworkController (chain ID lookups)
 * - transaction: TransactionController (TX submission)
 * - rewards: RewardsController (fee discounts, optional)
 *
 * Benefits:
 * 1. Clear separation - all controller access via deps.controllers.*
 * 2. Consistent pattern - utilities flat, controllers grouped
 * 3. Mockable - test can mock entire controllers object
 * 4. Future-proof - add new controller access without bloating top-level
 */
function createControllerAccessAdapter(): IPerpsControllerAccess {
  return {
    // === Account Operations (wraps AccountsController) ===
    accounts: {
      getSelectedEvmAccount: () => {
        // Inline implementation (was getEvmAccountFromSelectedAccountGroup)
        // Uses pure findEvmAccount from accountUtils + Engine access
        const { AccountTreeController } = Engine.context;
        const accounts =
          AccountTreeController.getAccountsFromSelectedAccountGroup();
        return findEvmAccount(accounts) ?? undefined;
      },
      formatAccountToCaipId: (address, chainId) =>
        formatAccountToCaipAccountId(address, chainId),
    },

    // === Keyring Operations (wraps KeyringController) ===
    keyring: {
      signTypedMessage: async (msgParams, version) => {
        // Map version string to SignTypedDataVersion enum
        let versionEnum: SignTypedDataVersion;
        switch (version) {
          case 'V4':
            versionEnum = SignTypedDataVersion.V4;
            break;
          case 'V3':
            versionEnum = SignTypedDataVersion.V3;
            break;
          default:
            versionEnum = SignTypedDataVersion.V1;
        }

        return Engine.context.KeyringController.signTypedMessage(
          msgParams as TypedMessageParams,
          versionEnum,
        );
      },

      signPersonalMessage: async (msgParams) =>
        Engine.context.KeyringController.signPersonalMessage(
          msgParams as PersonalMessageParams,
        ),
    },

    // === Network Operations (wraps NetworkController) ===
    network: {
      getChainIdForNetwork: (networkClientId) => {
        const client =
          Engine.context.NetworkController.getNetworkClientById(
            networkClientId,
          );
        return client.configuration.chainId;
      },
      findNetworkClientIdForChain: (chainId) =>
        Engine.context.NetworkController.findNetworkClientIdByChainId(chainId),
    },

    // === Transaction Operations (wraps TransactionController) ===
    transaction: {
      submit: (txParams, options) =>
        Engine.context.TransactionController.addTransaction(txParams, {
          ...options,
          // Bridge string type to TransactionType enum for actual controller
          type: options.type as TransactionType | undefined,
        }),
    },

    // === Rewards Operations (wraps RewardsController, optional) ===
    // Check if RewardsController exists - may not in all environments (e.g., extension)
    // Uses getter to defer Engine.context access until actually needed (lazy evaluation)
    get rewards() {
      if (!Engine.context.RewardsController) {
        return undefined;
      }
      return {
        getFeeDiscount: (caipAccountId: `${string}:${string}:${string}`) =>
          Engine.context.RewardsController.getPerpsDiscountForAccount(
            caipAccountId,
          ),
      };
    },
  };
}
