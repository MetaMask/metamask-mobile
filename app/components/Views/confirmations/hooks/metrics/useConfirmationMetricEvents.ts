import { useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../../core/Analytics/MetaMetrics.types';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  CONFIRMATION_EVENTS,
  TOOLTIP_TYPES,
} from '../../../../../core/Analytics/events/confirmations';
import {
  ConfirmationMetrics,
  updateConfirmationMetric,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useConfirmationLocation } from './useConfirmationLocation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { tat3974Mark } from '../../utils/tat3974-marker';

// TAT-3974 probe: flip to true to cut the footer->redux dispatch edge.
const TAT3974_NEUTRALIZE_DISPATCH = false;

export function useConfirmationMetricEvents() {
  const { createEventBuilder, trackEvent } = useAnalytics();
  const location = useConfirmationLocation();
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();
  const signatureRequest = useSignatureRequest();

  const tat3974Prev = useRef<Record<string, unknown>>({});
  const tat3974Deps = {
    createEventBuilder,
    dispatch,
    location,
    trackEvent,
    transactionMeta,
    signatureRequest,
  } as Record<string, unknown>;
  const tat3974Changed = Object.keys(tat3974Deps).filter(
    (k) => tat3974Prev.current[k] !== tat3974Deps[k],
  );
  if (
    Object.keys(tat3974Prev.current).length > 0 &&
    tat3974Changed.length > 0
  ) {
    tat3974Mark(`metric-events-dep-changed:${tat3974Changed.join('+')}`);
    if (tat3974Changed.includes('transactionMeta')) {
      const prevTx = (tat3974Prev.current.transactionMeta ?? {}) as Record<
        string,
        unknown
      >;
      const nextTx = (transactionMeta ?? {}) as unknown as Record<
        string,
        unknown
      >;
      const keys = Array.from(
        new Set([...Object.keys(prevTx), ...Object.keys(nextTx)]),
      );
      const fields = keys.filter(
        (k) => JSON.stringify(prevTx[k]) !== JSON.stringify(nextTx[k]),
      );
      tat3974Mark(
        `txmeta-fields-changed:${fields.length ? fields.join(',') : 'IDENTITY_ONLY'}`,
      );
    }
  }
  tat3974Prev.current = tat3974Deps;

  const events = useMemo(() => {
    tat3974Mark('useConfirmationMetricEvents-memo-recompute');
    const trackAdvancedDetailsToggledEvent = ({ isExpanded }: JsonMap) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.ADVANCED_DETAILS_CLICKED,
        properties: {
          location,
          is_expanded: isExpanded,
        },
      });

      trackEvent(event);
    };

    const trackTooltipClickedEvent = ({
      tooltip,
    }: {
      tooltip: TOOLTIP_TYPES;
    }) => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.TOOLTIP_CLICKED,
        properties: {
          location,
          tooltip,
        },
      });

      trackEvent(event);
    };

    const trackPageViewedEvent = () => {
      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.SCREEN_VIEWED,
        properties: {
          location,
        },
      });

      trackEvent(event);
    };

    const trackBlockaidAlertLinkClickedEvent = () => {
      const signatureType = signatureRequest?.type;
      const signatureFromAddress = signatureRequest?.messageParams?.from;
      const transactionType = transactionMeta?.type;
      const transactionFromAddress = transactionMeta?.txParams?.from;

      const type = transactionType ?? signatureType;
      const fromAddress = transactionFromAddress ?? signatureFromAddress;

      const event = generateEvent({
        createEventBuilder,
        metametricsEvent: CONFIRMATION_EVENTS.BLOCKAID_ALERT_LINK_CLICKED,
        properties: {
          external_link_clicked: 'security_alert_support_link',
          from_address: fromAddress,
          location,
          type,
        },
      });
      trackEvent(event);
    };

    const setConfirmationMetric = (metricParams: ConfirmationMetrics) => {
      if (!transactionMeta && !signatureRequest) {
        return;
      }
      tat3974Mark('setConfirmationMetric-dispatch');
      if (TAT3974_NEUTRALIZE_DISPATCH) {
        return;
      }
      dispatch(
        updateConfirmationMetric({
          id: (transactionMeta?.id || signatureRequest?.id) as string,
          params: metricParams,
        }),
      );
    };

    return {
      trackAdvancedDetailsToggledEvent,
      trackBlockaidAlertLinkClickedEvent,
      trackTooltipClickedEvent,
      trackPageViewedEvent,
      setConfirmationMetric,
    };
  }, [
    createEventBuilder,
    dispatch,
    location,
    trackEvent,
    transactionMeta,
    signatureRequest,
  ]);

  return { ...events };
}

function generateEvent({
  createEventBuilder,
  metametricsEvent,
  properties,
  sensitiveProperties,
}: {
  createEventBuilder: ReturnType<typeof useAnalytics>['createEventBuilder'];
  metametricsEvent: IMetaMetricsEvent;
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}) {
  return createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}
