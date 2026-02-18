import type { SecurityAlertResponse } from '@metamask/transaction-controller';

import { ResultType } from '../../../../../components/Views/confirmations/constants/signatures';
import type { JsonMap } from '../../../../Analytics/MetaMetrics.types';
import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';

export function getSecurityAlertResponseProperties({
  transactionMeta,
}: TransactionMetricsBuilderRequest): TransactionMetrics {
  const { securityAlertResponse } = transactionMeta;

  if (!securityAlertResponse) {
    return {
      properties: {},
      sensitiveProperties: {},
    };
  }

  const { result_type, reason, providerRequestsCount } =
    securityAlertResponse as SecurityAlertResponse & { source: string };

  const properties: JsonMap = {
    security_alert_response: result_type,
    security_alert_reason: reason,
  };

  if (result_type === ResultType.Malicious) {
    properties.ui_customizations = ['flagged_as_malicious'];
  } else if (result_type === ResultType.RequestInProgress) {
    properties.ui_customizations = ['security_alert_loading'];
    properties.security_alert_response = 'loading';
  }

  if (providerRequestsCount) {
    Object.keys(providerRequestsCount).forEach((key: string) => {
      properties[`ppom_${key}_count`] = providerRequestsCount[key];
    });
  }

  return {
    properties,
    sensitiveProperties: {},
  };
}
