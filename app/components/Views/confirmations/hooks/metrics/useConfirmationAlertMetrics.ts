import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectConfirmationMetricsById } from '../../../../../core/redux/slices/confirmationMetrics';
import { useAlerts } from '../../context/alert-system-context';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { Alert } from '../../types/alerts';
import { RootState } from '../../../../../reducers';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { AlertKeys } from '../../constants/alerts';

type AlertNameMetrics = {
  [K in AlertKeys]: string;
};

export function useConfirmationAlertMetrics() {
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { alerts, isAlertConfirmed, alertKey } = useAlerts();
  const signatureRequest = useSignatureRequest();

  const alertProperties = useMemo(
    () =>
      alerts.length > 0
        ? {
            alert_trigger_count: alerts.length,
            alert_trigger_name: getAlertNames(alerts),
            alert_resolved_count: alerts.filter((alertSelected) =>
              isAlertConfirmed(alertSelected.key),
            ).length,
            alert_resolved: getAlertNames(
              alerts.filter((alertSelected) =>
                isAlertConfirmed(alertSelected.key),
              ),
            ),
          }
        : undefined,
    [alerts, isAlertConfirmed],
  );

  const confirmationMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, signatureRequest?.id ?? ''),
  );

  const trackInlineAlertClicked = useCallback(
    (alertField?: string) => {
      const alertKeyClicked = uniqueFreshArrayPush(
        (confirmationMetrics?.properties?.alert_key_clicked as string[]) ?? [],
        getAlertName(alertKey),
      );
      const alertFieldClickedMetrics =
        (confirmationMetrics?.properties?.alert_field_clicked as string[]) ??
        [];
      const alertFieldClicked = alertField
        ? uniqueFreshArrayPush(alertFieldClickedMetrics, alertField)
        : alertFieldClickedMetrics;

      setConfirmationMetric({
        properties: {
          ...alertProperties,
          alert_key_clicked: alertKeyClicked,
          alert_field_clicked: alertFieldClicked,
        },
      });
    },
    [confirmationMetrics, alertKey, setConfirmationMetric, alertProperties],
  );

  const trackAlertRendered = useCallback(() => {
    const alertVisualized = uniqueFreshArrayPush(
      (confirmationMetrics?.properties?.alert_visualized as string[]) ?? [],
      getAlertName(alertKey),
    );

    setConfirmationMetric({
      properties: {
        ...alertProperties,
        alert_visualized: alertVisualized,
        alert_visualized_count: alertVisualized.length,
      },
    });
  }, [confirmationMetrics, alertKey, setConfirmationMetric, alertProperties]);

  const trackAlertMetrics = useCallback(() => {
    if (!alertProperties) {
      return;
    }
    setConfirmationMetric({
      properties: {
        ...alertProperties,
      },
    });
  }, [alertProperties, setConfirmationMetric]);

  return {
    trackAlertRendered,
    trackInlineAlertClicked,
    trackAlertMetrics,
  };
}

function uniqueFreshArrayPush<T>(array: T[], value: T): T[] {
  return [...new Set([...array, value])];
}

function getAlertNames(alerts: Alert[]): string[] {
  return alerts.map((alertSelected) => getAlertName(alertSelected.key));
}

const ALERTS_NAME_METRICS: AlertNameMetrics = {
  [AlertKeys.AddressTrustSignalMalicious]: 'address_trust_signal_malicious',
  [AlertKeys.AddressTrustSignalWarning]: 'address_trust_signal_warning',
  [AlertKeys.BatchedUnusedApprovals]: 'batched_unused_approvals',
  [AlertKeys.Blockaid]: 'blockaid',
  [AlertKeys.BurnAddress]: 'burn_address',
  [AlertKeys.DomainMismatch]: 'domain_mismatch',
  [AlertKeys.InsufficientBalance]: 'insufficient_balance',
  [AlertKeys.InsufficientPayTokenBalance]: 'insufficient_funds',
  [AlertKeys.InsufficientPayTokenFees]: 'insufficient_funds_for_fees',
  [AlertKeys.InsufficientPayTokenNative]: 'insufficient_funds_for_gas',
  [AlertKeys.InsufficientPredictBalance]: 'insufficient_funds',
  [AlertKeys.NoPayTokenQuotes]: 'no_payment_route_available',
  [AlertKeys.OriginTrustSignalMalicious]: 'origin_trust_signal_malicious',
  [AlertKeys.OriginTrustSignalWarning]: 'origin_trust_signal_warning',
  [AlertKeys.PendingTransaction]: 'pending_transaction',
  [AlertKeys.PerpsDepositMinimum]: 'minimum_deposit',
  [AlertKeys.PerpsHardwareAccount]: 'perps_hardware_account',
  [AlertKeys.SignedOrSubmitted]: 'signed_or_submitted',
  [AlertKeys.TokenTrustSignalMalicious]: 'token_trust_signal_malicious',
  [AlertKeys.TokenTrustSignalWarning]: 'token_trust_signal_warning',
};

function getAlertName(alertKey: string): string {
  return ALERTS_NAME_METRICS[alertKey as AlertKeys] ?? alertKey;
}
