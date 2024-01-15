import {
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';
import { getDecimalChainId } from '../networks';
import { store } from '../../store';
import { selectChainId } from '../../selectors/networkController';

export const SUPPORTED_CHAIN_IDS: string[] = [
  '0x1', // Ethereum Mainnet Chain ID
];

export const isSupportedChainId = (chainId: string) => {
  /**
   * Quite a number of our test cases return undefined as chainId from state.
   * So, this allowing undefined chainId for now.
   * */
  if (chainId === undefined) {
    return true;
  }

  const isSupported  = SUPPORTED_CHAIN_IDS.find(
    (id) => getDecimalChainId(id) === getDecimalChainId(chainId),
  ) !== undefined;

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
