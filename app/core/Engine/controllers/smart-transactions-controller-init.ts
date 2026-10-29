import { MessengerClientInitFunction } from '../types';
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
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent as PackageAnalyticsTrackingEvent } from '@metamask/analytics-controller';
import { trace } from '../../../util/trace';
import { getAllowedSmartTransactionsChainIds } from '../../../constants/smartTransactions';

/**
 * Initialize the smart transactions controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const smartTransactionsControllerInit: MessengerClientInitFunction<
  SmartTransactionsController,
  SmartTransactionsControllerMessenger,
  SmartTransactionsControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
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
        .addProperties(params.properties)
        .addSensitiveProperties(params.sensitiveProperties)
        .build();

      // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
      initMessenger.call(
        'AnalyticsController:trackEvent',
        event as unknown as PackageAnalyticsTrackingEvent,
      );
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
