import {
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';
import { getDecimalChainId } from '../networks';
import { store } from '../../store';
import { selectChainId } from '../../selectors/networkController';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

export const SUPPORTED_CHAIN_IDS: string[] = [
  NETWORKS_CHAIN_ID.MAINNET, // Ethereum Mainnet Chain ID
];

export const isSupportedChainId = (chainId: string) => {
  /**
   * Quite a number of our test cases return undefined as chainId from state.
   * In such cases, the tests don't really care about the chainId.
   * So, this treats undefined chainId as mainnet for now.
   * */
  if (chainId === undefined) {
    return true;
  }

  const isSupported = SUPPORTED_CHAIN_IDS.some(
    (id) => getDecimalChainId(id) === getDecimalChainId(chainId),
  );

  return isSupported;
};

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
