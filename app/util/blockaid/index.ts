import {
  Reason,
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';

// eslint-disable-next-line import/prefer-default-export
export const isBlockaidFeatureEnabled = () =>
  process.env.MM_BLOCKAID_UI_ENABLED === 'true';

export const getBlockaidMetricsParams = (
  securityAlertResponse?: SecurityAlertResponse,
) => {
  const additionalParams: Record<string, any> = {};

  if (securityAlertResponse && isBlockaidFeatureEnabled()) {
    const { resultType, reason, providerRequestsCount } = securityAlertResponse;

    if (resultType === ResultType.Malicious) {
      additionalParams.ui_customizations = ['flagged_as_malicious'];
    }

    if (resultType !== ResultType.Benign) {
      additionalParams.security_alert_reason = Reason.notApplicable;

      if (reason) {
        additionalParams.security_alert_response = resultType;
        additionalParams.security_alert_reason = reason;
      }
    }

    // add counts of each RPC call
    if (providerRequestsCount) {
      Object.keys(providerRequestsCount).forEach((key: string) => {
        const metricKey = `ppom_${key}_count`;
        additionalParams[metricKey] = providerRequestsCount[key];
      });
    }
  }

  return additionalParams;
};
