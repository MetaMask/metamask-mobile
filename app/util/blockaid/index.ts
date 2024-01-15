import {
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';
import NetworkList, { getDecimalChainId } from '../networks';
import { store } from '../../store';
import { selectChainId } from '../../selectors/networkController';

export const SUPPORTED_CHAIN_IDS: number[] = [NetworkList.mainnet.chainId];

export const isSupportedChainId = (chainId: string) =>
  SUPPORTED_CHAIN_IDS.find(
    (id) => getDecimalChainId(String(id)) === chainId,
  ) !== undefined;

// eslint-disable-next-line import/prefer-default-export
export const isBlockaidFeatureEnabled = () => {
  const chainId = selectChainId(store.getState());
  return (
    process.env.MM_BLOCKAID_UI_ENABLED === 'true' && isSupportedChainId(chainId)
  );
};

export const getBlockaidMetricsParams = (
  securityAlertResponse?: SecurityAlertResponse,
) => {
  const additionalParams: Record<string, any> = {};

  if (securityAlertResponse && isBlockaidFeatureEnabled()) {
    const { result_type, reason, providerRequestsCount } =
      securityAlertResponse;

    additionalParams.security_alert_response = result_type;
    additionalParams.security_alert_reason = reason;

    if (result_type === ResultType.Malicious) {
      additionalParams.ui_customizations = ['flagged_as_malicious'];
    } else if (result_type === ResultType.RequestInProgress) {
      additionalParams.ui_customizations = ['security_alert_loading'];
      additionalParams.security_alert_response = 'loading';
    }

    // add counts of each RPC call
    if (providerRequestsCount) {
      Object.keys(providerRequestsCount).forEach((key: string) => {
        const metricKey = `ppom_${key}_count`;
        additionalParams[metricKey] = providerRequestsCount[key];
      });
    }
  } else {
    additionalParams.security_alert_response = 'NotApplicable';
    additionalParams.security_alert_reason = 'NotApplicable';
  }

  return additionalParams;
};
