import React, { type ReactNode, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UiSlotsScreenId } from '../../../core/Engine/controllers/ui-slots-controller/types';
import type { RootState } from '../../../reducers';
import {
  makeSelectHasActiveUiSlotsConfiguration,
  makeSelectUiSlot,
  selectUiSlotsEnabled,
} from '../../../selectors/uiSlotsController';
import { UiSlotErrorBoundary } from './UiSlotErrorBoundary';
import { MOBILE_UI_SLOT_WIDGETS } from './registry';

const FALLBACK_RESET_KEY = {};

export function UiSlotRenderer({
  screenId,
  slotId,
  fallback = null,
  fallbackOnEmpty = false,
}: {
  screenId: UiSlotsScreenId;
  slotId: string;
  fallback?: ReactNode;
  fallbackOnEmpty?: boolean;
}) {
  const selectSlot = useMemo(makeSelectUiSlot, []);
  const selectHasActiveConfiguration = useMemo(
    makeSelectHasActiveUiSlotsConfiguration,
    [],
  );
  const selectThisSlot = useMemo(
    () => (state: RootState) => selectSlot(state, screenId, slotId),
    [selectSlot, screenId, slotId],
  );
  const selectThisHasActiveConfiguration = useMemo(
    () => (state: RootState) => selectHasActiveConfiguration(state, screenId),
    [selectHasActiveConfiguration, screenId],
  );
  const slot = useSelector(selectThisSlot);
  const hasActiveConfiguration = useSelector(selectThisHasActiveConfiguration);
  const enabled = useSelector(selectUiSlotsEnabled);
  const useFallback =
    !enabled || !hasActiveConfiguration || (!slot && fallbackOnEmpty);
  if (!slot && !useFallback) {
    return null;
  }

  const Widget = slot && MOBILE_UI_SLOT_WIDGETS[slot.widget.type];
  const content = useFallback || !Widget ? fallback : <Widget slot={slot} />;
  if (content === null || content === undefined || content === false) {
    return null;
  }

  return (
    <UiSlotErrorBoundary
      slotId={slot?.slotId ?? slotId}
      contentId={slot?.contentId ?? 'bundled-fallback'}
      resetKey={slot ?? FALLBACK_RESET_KEY}
      fallback={useFallback || !Widget ? null : fallback}
    >
      {content}
    </UiSlotErrorBoundary>
  );
}
