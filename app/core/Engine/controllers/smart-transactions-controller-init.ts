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
import { selectSwapsChainFeatureFlags } from '../../../reducers/swaps';
import { MetaMetrics } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { trace } from '../../../util/trace';
import { getAllowedSmartTransactionsChainIds } from '../../../constants/smartTransactions';

/**
 * Initialize the smart transactions controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const smartTransactionsControllerInit: ControllerInitFunction<
  SmartTransactionsController,
  SmartTransactionsControllerMessenger
> = ({ controllerMessenger, persistedState, getState }) => {
  const trackMetaMetricsEvent = (params: {
    event: MetaMetricsEventName;
    category: MetaMetricsEventCategory;
    properties?: ReturnType<typeof getSmartTransactionMetricsProperties>;
    sensitiveProperties?: ReturnType<
      typeof getSmartTransactionMetricsSensitiveProperties
    >;
  }) => {
    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder({
        category: params.event,
      })
        .addProperties(params.properties || {})
        .addSensitiveProperties(params.sensitiveProperties || {})
        .build(),
    );
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
