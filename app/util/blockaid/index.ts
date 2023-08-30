import { ResultType, SecurityAlertResponse } from 'app/components/UI/BlockaidBanner/BlockaidBanner.types';

// eslint-disable-next-line import/prefer-default-export
export const showBlockaidUI = () =>
  process.env.MM_BLOCKAID_UI_ENABLED === 'true';

export const getAdditionalMetricsParams = (securityAlertResponse: SecurityAlertResponse) => {
  const { resultType, reason } = securityAlertResponse;
  let uiCustomizations;
  
  if (resultType === ResultType.Malicious) {
    uiCustomizations = ['flagged_as_malicious'];
  }

  const additionalParams: Record<string, any> = {
    ui_customizations: uiCustomizations,
  };

  if (resultType !== ResultType.Benign) {
    additionalParams['security_alert_response'] = resultType;
    additionalParams['security_alert_reason'] = reason;
  }

  return additionalParams;
};
