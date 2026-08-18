import React, { useMemo, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type { UiSlotsScreenId } from '../../../core/Engine/controllers/ui-slots-controller/types';
import { makeSelectUiSlotResolution } from '../../../selectors/uiSlotsController';
import { MOBILE_UI_SLOT_WIDGET_REGISTRY } from './mobileWidgetRegistry';
import { UiSlotErrorBoundary } from './UiSlotErrorBoundary';

export function UiSlotRenderer({
  screenId,
  slotId,
  fallback = null,
}: {
  screenId: UiSlotsScreenId;
  slotId: string;
  fallback?: ReactNode;
}) {
  const selector = useMemo(
    () => makeSelectUiSlotResolution(screenId, slotId),
    [screenId, slotId],
  );
  const resolution = useSelector(selector);

  if (resolution.status === 'fallback') {
    return fallback;
  }
  if (resolution.status === 'empty') {
    return null;
  }
  const { slot } = resolution;

  const Widget = MOBILE_UI_SLOT_WIDGET_REGISTRY[slot.widget.type];
  return Widget ? (
    <UiSlotErrorBoundary
      key={`${slot.contentId}:${slot.revision}`}
      slotId={slot.slotId}
      contentId={slot.contentId}
      fallback={fallback}
    >
      <Widget slot={slot} />
    </UiSlotErrorBoundary>
  ) : (
    fallback
  );
}
