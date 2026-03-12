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
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { trace } from '../../../util/trace';
import { getAllowedSmartTransactionsChainIds } from '../../../constants/smartTransactions';
import { setSentinelApiAuth } from '../../../util/transactions/sentinel-api';

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

      initMessenger.call('AnalyticsController:trackEvent', event);
    } catch (error) {
      // Analytics tracking failures should not break smart transactions
      // Error is logged but not thrown
    }
  };

  /**
   * Bearer token for Transaction API (and Sentinel) authentication. Only present when
   * the user is signed in (AuthenticationController has a valid session). If getBearerToken
   * returns undefined, no Authorization header is sent on smart transaction API calls.
   */
  const getBearerToken = async (): Promise<string | undefined> => {
    try {
      return await Promise.resolve(
        initMessenger.call('AuthenticationController:getBearerToken'),
      );
    } catch {
      return undefined;
    }
  };

  // Use same bearer token for Sentinel API (networks, relay) as for Transaction API
  setSentinelApiAuth(getBearerToken);

  const controller = new SmartTransactionsController({
    messenger: controllerMessenger,
    state: persistedState.SmartTransactionsController,
    supportedChainIds: getAllowedSmartTransactionsChainIds(),
    clientId: ClientId.Mobile,
    // TODO: Return MetaMetrics props once we enable HW wallets for smart
    // transactions.
    getMetaMetricsProps: () => Promise.resolve({}),
    trackMetaMetricsEvent,
    getBearerToken,

    // @ts-expect-error: Type of `TraceRequest` is different.
    trace,
  });

  return {
    controller,
  };
};
