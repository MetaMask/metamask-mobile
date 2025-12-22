import { ControllerInitFunction } from '../types';
import {
  getSmartTransactionMetricsProperties,
  SmartTransactionsController,
  ClientId,
  getSmartTransactionMetricsSensitiveProperties,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  type SmartTransactionsControllerMessenger,
} from '@metamask/smart-transactions-controller';
import type { SmartTransactionsControllerInitMessenger } from '../messengers/smart-transactions-controller-messenger';
import { selectSwapsChainFeatureFlags } from '../../../reducers/swaps';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { trace } from '../../../util/trace';
import { getAllowedSmartTransactionsChainIds } from '../../../constants/smartTransactions';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';

/**
 * Filter out undefined values from an object to make it compatible with AnalyticsEventProperties.
 *
 * @param obj - The object to filter.
 * @returns A new object without undefined values.
 */
function filterUndefinedValues(
  obj: Record<string, unknown> | undefined,
): AnalyticsEventProperties {
  if (!obj) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as AnalyticsEventProperties;
}

/**
 * Initialize the smart transactions controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const smartTransactionsControllerInit: ControllerInitFunction<
  SmartTransactionsController,
  SmartTransactionsControllerMessenger,
  SmartTransactionsControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState, getState }) => {
  const trackMetaMetricsEvent = (params: {
    event: MetaMetricsEventName;
    category: MetaMetricsEventCategory;
    properties?: ReturnType<typeof getSmartTransactionMetricsProperties>;
    sensitiveProperties?: ReturnType<
      typeof getSmartTransactionMetricsSensitiveProperties
    >;
  }) => {
    try {
      const event = AnalyticsEventBuilder.createEventBuilder(params.event)
        .addProperties(filterUndefinedValues(params.properties))
        .addSensitiveProperties(
          filterUndefinedValues(params.sensitiveProperties),
        )
        .build();

      initMessenger.call('AnalyticsController:trackEvent', event);
    } catch (error) {
      // Analytics tracking failures should not break smart transactions
      // Error is logged but not thrown
    }
  };

  const controller = new SmartTransactionsController({
    messenger: controllerMessenger,
    state: persistedState.SmartTransactionsController,
    supportedChainIds: getAllowedSmartTransactionsChainIds(),
    clientId: ClientId.Mobile,
    getFeatureFlags: () => selectSwapsChainFeatureFlags(getState()),

    // TODO: Return MetaMetrics props once we enable HW wallets for smart
    // transactions.
    getMetaMetricsProps: () => Promise.resolve({}),
    trackMetaMetricsEvent,

    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,
  });

  return {
    controller,
  };
};
