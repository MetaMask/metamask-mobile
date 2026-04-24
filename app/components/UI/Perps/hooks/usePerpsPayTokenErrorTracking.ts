import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { Alert } from '../../../Views/confirmations/types/alerts';
import { usePerpsEventTracking } from './usePerpsEventTracking';

/**
 * Extracts a human-readable message from a blocking pay-token alert,
 * falling back through title -> key -> a static sentinel.
 */
export function getBlockingAlertMessage(payAlert: Alert | undefined): string {
  if (!payAlert) return 'unknown_blocking_alert';
  if (typeof payAlert.message === 'string') return payAlert.message;
  return payAlert.title ?? payAlert.key ?? 'unknown_blocking_alert';
}

interface PayTokenErrorTrackingParams {
  hasBlockingPayAlerts: boolean;
  blockingPayAlerts: Alert[];
  hasInsufficientPayTokenBalance: boolean;
}

/**
 * Declarative analytics tracking for pay-token validation errors shown on the
 * order screen. Fires a PERPS_ERROR event when:
 * 1. A blocking pay-token alert (e.g. insufficient balance, no quotes) appears.
 * 2. The locally-computed insufficient-balance warning becomes true.
 *
 * Both events automatically reset when their condition clears so they can
 * re-fire if the condition reoccurs.
 */
export const usePerpsPayTokenErrorTracking = ({
  hasBlockingPayAlerts,
  blockingPayAlerts,
  hasInsufficientPayTokenBalance,
}: PayTokenErrorTrackingParams): void => {
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [hasBlockingPayAlerts, blockingPayAlerts.length > 0],
    resetConditions: [!hasBlockingPayAlerts],
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: getBlockingAlertMessage(
        blockingPayAlerts[0],
      ),
      [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
        PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
    },
  });

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_ERROR,
    conditions: [hasInsufficientPayTokenBalance],
    resetConditions: [!hasInsufficientPayTokenBalance],
    properties: {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
      [PERPS_EVENT_PROPERTY.WARNING_MESSAGE]:
        PERPS_EVENT_VALUE.ERROR_MESSAGE_KEY.INSUFFICIENT_BALANCE,
      [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
        PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
    },
  });
};
