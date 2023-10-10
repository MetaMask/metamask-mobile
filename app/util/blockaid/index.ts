import {
  Reason,
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';

// eslint-disable-next-line import/prefer-default-export
export const isBlockaidFeatureEnabled = () =>
  process.env.MM_BLOCKAID_UI_ENABLED === 'true';

export const getBlockaidMetricsParams = (
  securityAlertResponse: SecurityAlertResponse,
) => {
  const additionalParams: Record<string, any> = {};

  if (securityAlertResponse && isBlockaidFeatureEnabled()) {
    const { result_type, reason } = securityAlertResponse;
    let uiCustomizations;

    if (result_type === ResultType.Malicious) {
      uiCustomizations = ['flagged_as_malicious'];
    }

    additionalParams.ui_customizations = uiCustomizations;

    if (result_type !== ResultType.Benign) {
      additionalParams.security_alert_reason = Reason.notApplicable;

      if (reason) {
        additionalParams.security_alert_response = result_type;
        additionalParams.security_alert_reason = reason;
      }
    }
  }

  return additionalParams;
};
