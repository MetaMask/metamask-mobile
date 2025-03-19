import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectConfirmationMetrics,
} from '../../../../core/redux/slices/confirmationMetrics';
import { useAlerts } from '../AlertSystem/context';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { Alert } from '../types/alerts';

export enum AlertNames {
  Blockaid = 'blockaid',
  DomainMismatch = 'requestFrom',
}

export function useConfirmationAlertMetric() {
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { alerts, isAlertConfirmed, alertKey } = useAlerts();

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

  const confirmationMetricsProperties = useSelector(selectConfirmationMetrics);
  console.log('confirmationMetricsProperties >>>>>>', confirmationMetricsProperties);
  setConfirmationMetric({
    properties: {
      ...alertProperties,
    },
  });
  console.log('alertProperties >>>>>>', alertProperties);

  const trackers = useMemo(() => {
    const trackInlineAlertClicked = () => {
      console.log('confirmationMetricsProperties >>>>>>', confirmationMetricsProperties);

      const alertVisualized = uniqueFreshArrayPush(confirmationMetricsProperties.alert_visualized, alertKey);
      console.log('alertVisualized >>>>>>', alertVisualized);

      setConfirmationMetric({
        properties: {
          ...alertProperties,
          alert_visualized: alertVisualized,
          alert_visualized_count: alertVisualized.length,
        },
      });
    };

    const trackAlertRendered = () => {
      console.log('confirmationMetricsProperties >>>>>>', confirmationMetricsProperties);
      const alertRendered = uniqueFreshArrayPush(confirmationMetricsProperties.alert_rendered, alertKey);
      console.log('alertRendered >>>>>>', alertRendered);

      setConfirmationMetric({
        properties: {
          ...alertProperties,
          alert_rendered: alertRendered,
          alert_rendered_count: alertRendered.length,
        },
      });
    };

    return {
      trackAlertRendered,
      trackInlineAlertClicked,
    };
  }, [confirmationMetricsProperties, alertKey, setConfirmationMetric, alertProperties]);

  return { ...trackers };
}

function uniqueFreshArrayPush<T>(array: T[], value: T): T[] {
  return [...new Set([...array, value])];
}

function getAlertNames(alerts: Alert[]): string[] {
  return alerts.map((alertSelected) => getAlertName(alertSelected.key));
}

const ALERTS_NAME_METRICS: Record<AlertNames | string, string> = {
  [AlertNames.DomainMismatch]: 'domain_mismatch',
  [AlertNames.Blockaid]: 'blockaid',
};

function getAlertName(alertKey: string): string {
  return ALERTS_NAME_METRICS[alertKey] ?? alertKey;
}
