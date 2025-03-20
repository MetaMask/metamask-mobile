import { useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  selectConfirmationMetricsById,
} from '../../../../core/redux/slices/confirmationMetrics';
import { useAlerts } from '../AlertSystem/context';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { Alert } from '../types/alerts';
import { RootState } from '../../../../reducers';
import { useSignatureRequest } from './useSignatureRequest';
import { AlertKeys } from '../constants/alerts';

type AlertNameMetrics = {
  [K in AlertKeys]: string;
};

export function useConfirmationAlertMetric() {
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { alerts, isAlertConfirmed, alertKey } = useAlerts();
  const signatureRequest = useSignatureRequest();

  const alertProperties = useMemo(() => ({
    alert_trigger_count: alerts.length,
    alert_trigger_name: getAlertNames(alerts),
    alert_resolved_count: alerts.filter((alertSelected) =>
      isAlertConfirmed(alertSelected.key),
    ).length,
    alert_resolved: getAlertNames(
      alerts.filter((alertSelected) => isAlertConfirmed(alertSelected.key)),
    ),
  }), [alerts, isAlertConfirmed]);

  const confirmationMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, signatureRequest?.id ?? '')
  );

  useEffect(() => {
    setConfirmationMetric({
      properties: {
        ...alertProperties,
      },
    });
  }, [alertProperties, setConfirmationMetric]);

  const trackers = useMemo(() => {
    const trackInlineAlertClicked = () => {
      if (confirmationMetrics.properties && Array.isArray(confirmationMetrics.properties.alert_visualized)) {
        const alertVisualized = uniqueFreshArrayPush(
          confirmationMetrics.properties.alert_visualized as string[],
          alertKey
        );

        setConfirmationMetric({
          properties: {
            ...alertProperties,
            alert_visualized: alertVisualized,
            alert_visualized_count: alertVisualized.length,
          },
        });
      }
    };

    const trackAlertRendered = () => {
      if (confirmationMetrics.properties && Array.isArray(confirmationMetrics.properties.alert_rendered)) {
        const alertRendered = uniqueFreshArrayPush(
          confirmationMetrics.properties.alert_rendered as string[],
          alertKey
        );

        setConfirmationMetric({
          properties: {
            ...alertProperties,
            alert_rendered: alertRendered,
            alert_rendered_count: alertRendered.length,
          },
        });
      }
    };

    return {
      trackAlertRendered,
      trackInlineAlertClicked,
    };
  }, [confirmationMetrics, alertKey, setConfirmationMetric, alertProperties]);

  return { ...trackers };
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
};

function getAlertName(alertKey: string): string {
  return ALERTS_NAME_METRICS[alertKey as AlertKeys] ?? alertKey;
}
