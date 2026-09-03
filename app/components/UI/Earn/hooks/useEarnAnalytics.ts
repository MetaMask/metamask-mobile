import { useCallback } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { resolveTrackingLabel } from '../../Money/utils/moneyTrackingLabel';
import { EARN_MODULE_BUTTON_TYPES } from '../constants/earnModuleEvents';
import type {
  EarnModuleButtonClickedProperties,
  EarnModuleEventLocation,
  EarnModuleRedirectProperties,
  EarnModuleSurfaceClickedProperties,
  EarnModuleSurfaceViewedProperties,
} from '../types/earnModuleEvents.types';
import { resolveEarnModuleRedirectTargetType } from '../utils/earnModuleRedirectTarget';

const withRedirectType = (
  properties: EarnModuleRedirectProperties,
): EarnModuleRedirectProperties => {
  if (!properties.redirect_target) {
    return properties;
  }

  return {
    ...properties,
    redirect_target_type: resolveEarnModuleRedirectTargetType(
      properties.redirect_target,
    ),
  };
};

const withLabel = (
  properties: EarnModuleButtonClickedProperties,
): Record<string, unknown> => {
  if (
    properties.button_type === EARN_MODULE_BUTTON_TYPES.TEXT &&
    'label_key' in properties &&
    properties.label_key
  ) {
    const { label_key, ...rest } = properties;
    return {
      ...rest,
      ...resolveTrackingLabel(label_key),
    };
  }

  return properties;
};

export const useEarnAnalytics = ({
  screen_name,
  component_name,
  bottom_sheet_name,
  entry_point,
}: EarnModuleEventLocation) => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  const getLocationProperties = useCallback(
    () => ({
      ...(screen_name ? { screen_name } : {}),
      ...(component_name ? { component_name } : {}),
      ...(bottom_sheet_name ? { bottom_sheet_name } : {}),
      entry_point,
    }),
    [bottom_sheet_name, component_name, entry_point, screen_name],
  );

  const trackSurfaceViewed = useCallback(
    (properties?: EarnModuleSurfaceViewedProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_MODULE_SURFACE_VIEWED)
          .addProperties({
            ...getLocationProperties(),
            ...properties,
          })
          .build(),
      );
    },
    [createEventBuilder, getLocationProperties, trackEvent],
  );

  const trackScreenViewed = useCallback(
    (properties?: EarnModuleSurfaceViewedProperties) =>
      trackSurfaceViewed(properties),
    [trackSurfaceViewed],
  );

  const trackComponentViewed = useCallback(
    (properties?: EarnModuleSurfaceViewedProperties) =>
      trackSurfaceViewed(properties),
    [trackSurfaceViewed],
  );

  const trackBottomSheetViewed = useCallback(
    (properties?: EarnModuleSurfaceViewedProperties) =>
      trackSurfaceViewed(properties),
    [trackSurfaceViewed],
  );

  const trackSurfaceClicked = useCallback(
    (properties: EarnModuleSurfaceClickedProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_MODULE_SURFACE_CLICKED)
          .addProperties({
            ...getLocationProperties(),
            ...withRedirectType(properties),
          })
          .build(),
      );
    },
    [createEventBuilder, getLocationProperties, trackEvent],
  );

  const trackButtonClicked = useCallback(
    (properties: EarnModuleButtonClickedProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_MODULE_BUTTON_CLICKED)
          .addProperties({
            ...getLocationProperties(),
            ...withRedirectType(withLabel(properties)),
          })
          .build(),
      );
    },
    [createEventBuilder, getLocationProperties, trackEvent],
  );

  return {
    trackScreenViewed,
    trackComponentViewed,
    trackBottomSheetViewed,
    trackSurfaceClicked,
    trackButtonClicked,
  };
};
