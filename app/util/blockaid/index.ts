import { FlagType } from 'app/components/UI/BlockaidBanner/BlockaidBanner.types';

// eslint-disable-next-line import/prefer-default-export
export const showBlockaidUI = () =>
  process.env.MM_BLOCKAID_UI_ENABLED === 'true';

export const getAdditionalMetricsParams = (transaction: any) => {
  const { result_type, reason } = transaction.securityAlertResponse;
  let uiCustomizations;
  
  if (result_type === FlagType.Malicious) {
    uiCustomizations = ['flagged_as_malicious'];
  }

  const additionalParams: Record<string, any> = {
    ui_customizations: uiCustomizations,
  };

  if (result_type !== FlagType.Benign) {
    additionalParams['security_alert_response'] = result_type;
    additionalParams['security_alert_reason'] = reason;
  }

  return additionalParams;
};
