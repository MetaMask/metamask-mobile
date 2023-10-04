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

  if (securityAlertResponse) {
    const { resultType, reason } = securityAlertResponse;
    let uiCustomizations;

    if (resultType === ResultType.Malicious) {
      uiCustomizations = ['flagged_as_malicious'];
    }

    additionalParams.ui_customizations = uiCustomizations;

    if (resultType !== ResultType.Benign) {
      additionalParams.security_alert_reason = Reason.notApplicable;

      if (reason) {
        additionalParams.security_alert_response = resultType;
        additionalParams.security_alert_reason = reason;
      }
    }
  }

  return additionalParams;
};
