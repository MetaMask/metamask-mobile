import React from 'react';
import type { UiSlot } from '../../../../../core/Engine/controllers/ui-slots-controller/types';
import { executeUiSlotAction } from '../../../UiSlots/mobileActionRegistry';
import PredictLiveNowSection from '../../views/PredictHome/components/PredictLiveNowSection';
import { isPredictFeedReference } from '../types';

export function MarketCarouselWidget({ slot }: { slot: UiSlot }) {
  if (slot.widget.type !== 'market-carousel') {
    return null;
  }

  const reference = slot.dataReferences?.find(isPredictFeedReference);
  if (!reference) {
    return null;
  }

  const navigateAction = slot.actions?.find(
    (action) => action.actionId === 'navigate-deeplink',
  );
  return (
    <PredictLiveNowSection
      feedReferenceOverride={reference}
      titleOverride={slot.widget.props.title}
      onHeaderPressOverride={
        navigateAction
          ? () => executeUiSlotAction(slot, navigateAction)
          : undefined
      }
    />
  );
}
