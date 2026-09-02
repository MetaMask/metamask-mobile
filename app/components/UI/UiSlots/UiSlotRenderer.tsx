import React, { type ComponentType, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type {
  UiSlot,
  UiSlotsScreenId,
  UiSlotWidget,
} from '../../../core/Engine/controllers/ui-slots-controller/types';
import type { RootState } from '../../../reducers';
import {
  selectUiSlotsControllerState,
  selectUiSlotsEnabled,
} from '../../../selectors/uiSlotsController';
import { PredictDiscoveryListWidget } from '../Predict/uiSlots/widgets/PredictDiscoveryListWidget';
import { UiSlotErrorBoundary } from './UiSlotErrorBoundary';

const WIDGETS = {
  'predict-discovery-list': PredictDiscoveryListWidget,
} satisfies Record<UiSlotWidget['type'], ComponentType<{ slot: UiSlot }>>;

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
  const slot = useSelector(
    (state: RootState) =>
      selectUiSlotsControllerState(state)?.activeConfigurations[screenId]
        ?.slotsById[slotId],
  );
  const hasActiveConfiguration = useSelector((state: RootState) =>
    Boolean(
      selectUiSlotsControllerState(state)?.activeConfigurations[screenId],
    ),
  );
  const enabled = useSelector(selectUiSlotsEnabled);
  if (!enabled || !hasActiveConfiguration) {
    return fallback;
  }
  if (!slot) {
    return fallbackOnEmpty ? fallback : null;
  }

  const Widget = WIDGETS[slot.widget.type];
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
