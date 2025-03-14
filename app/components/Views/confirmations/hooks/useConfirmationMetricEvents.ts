import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../core/Analytics/MetaMetrics.types';
import { useMetrics } from '../../../hooks/useMetrics';
import { CONFIRMATION_EVENTS } from '../../../../core/Analytics/events/confirmations';
import {
  TransactionMetrics,
  updateTransactionMetrics,
} from '../../../../core/redux/slices/transactionMetrics';
import { useConfirmationLocation } from './useConfirmationLocation';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export function useConfirmationMetricEvents() {
  const { createEventBuilder, trackEvent } = useMetrics();
  const location = useConfirmationLocation();
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();

  const events = useMemo(() => {
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

    const trackTooltipClickedEvent = ({ tooltip }: JsonMap) => {
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

    const setTransactionMetrics = (metricParams: TransactionMetrics) => {
      if (!transactionMeta) {
        return;
      }
      dispatch(
        updateTransactionMetrics({
          transactionId: transactionMeta.id,
          params: metricParams,
        }),
      );
    };

    return {
      trackAdvancedDetailsToggledEvent,
      trackTooltipClickedEvent,
      trackPageViewedEvent,
      setTransactionMetrics,
    };
  }, [createEventBuilder, dispatch, location, trackEvent, transactionMeta]);

  return { ...events };
}

function generateEvent({
  createEventBuilder,
  metametricsEvent,
  properties,
  sensitiveProperties,
}: {
  createEventBuilder: ReturnType<typeof useMetrics>['createEventBuilder'];
  metametricsEvent: IMetaMetricsEvent;
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}) {
  return createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}
