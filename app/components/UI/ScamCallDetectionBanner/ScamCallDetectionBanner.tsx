import React, { useCallback, useEffect, useRef } from 'react';
import { strings } from '../../../../locales/i18n';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { useCallDetection } from '../../hooks/useCallDetection';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';

const ScamCallDetectionBanner = () => {
  const { isOnCall, isDismissed, dismiss } = useCallDetection();
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedShow = useRef(false);

  const shouldShow = isOnCall && !isDismissed;

  useEffect(() => {
    if (shouldShow && !hasTrackedShow.current) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.SCAM_CALL_DETECTION_BANNER_SHOWN,
        ).build(),
      );
      hasTrackedShow.current = true;
    }
    if (!shouldShow) {
      hasTrackedShow.current = false;
    }
  }, [shouldShow, trackEvent, createEventBuilder]);

  const handleDismiss = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SCAM_CALL_DETECTION_BANNER_DISMISSED,
      ).build(),
    );
    dismiss();
  }, [dismiss, trackEvent, createEventBuilder]);

  if (!shouldShow) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Error}
      title={strings('scam_call_detection.banner_title')}
      description={strings('scam_call_detection.banner_description')}
      onClose={handleDismiss}
    />
  );
};

export default ScamCallDetectionBanner;
