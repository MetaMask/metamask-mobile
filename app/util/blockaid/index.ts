import Engine from '../../core/Engine';
import {
  ResultType,
  SecurityAlertResponse,
} from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';
import { store } from '../../store';
import { selectChainId } from '../../selectors/networkController';
import type { TransactionMeta } from '@metamask/transaction-controller';
import PPOMUtils from '../../lib/ppom/ppom-util';

interface TransactionSecurityAlertResponseType {
  securityAlertResponses: Record<string, SecurityAlertResponse>;
}

export type TransactionType = TransactionMeta &
  TransactionSecurityAlertResponseType;

export const isBlockaidSupportedOnCurrentChain = async (): Promise<boolean> => {
  const chainId = selectChainId(store.getState());
  return await PPOMUtils.isChainSupported(chainId);
};

export const isBlockaidPreferenceEnabled = (): boolean => {
  const { PreferencesController } = Engine.context;
  return PreferencesController.state.securityAlertsEnabled;
};

export const isBlockaidFeatureEnabled = async (): Promise<boolean> =>
  (await isBlockaidSupportedOnCurrentChain()) && isBlockaidPreferenceEnabled();

export const getBlockaidMetricsParams = (
  securityAlertResponse?: SecurityAlertResponse,
): Record<string, unknown> => {
  const additionalParams: Record<string, unknown> = {};

  if (securityAlertResponse) {
    const { result_type, reason, providerRequestsCount, source } =
      securityAlertResponse;

    additionalParams.security_alert_response = result_type;
    additionalParams.security_alert_reason = reason;
    additionalParams.security_alert_source = source;

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
  }

  return additionalParams;
};

export const getBlockaidTransactionMetricsParams = (
  transaction: TransactionType,
): Record<string, unknown> => {
  let blockaidParams = {};

  if (!transaction) {
    return blockaidParams;
  }

  const { securityAlertResponses, id } = transaction;
  const securityAlertResponse = securityAlertResponses?.[id];
  if (securityAlertResponse) {
    blockaidParams = getBlockaidMetricsParams(securityAlertResponse);
  }

  return blockaidParams;
};
