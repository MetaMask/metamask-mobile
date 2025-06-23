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
  [AlertKeys.Blockaid]: 'blockaid',
  [AlertKeys.DomainMismatch]: 'domain_mismatch',
  [AlertKeys.InsufficientBalance]: 'insufficient_balance',
};

function getAlertName(alertKey: string): string {
  return ALERTS_NAME_METRICS[alertKey as AlertKeys] ?? alertKey;
}
