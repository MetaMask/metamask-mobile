import React, { useMemo } from 'react';
import type { UiSlot } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { PredictDiscoveryListWidget } from '../../Predict/uiSlots/widgets/PredictDiscoveryListWidget';
import {
  isPredictHomepageMarketSlotReference,
  type PredictHomepageMarketSlotReference,
} from '../../Predict/uiSlots/types';
import { PredictImplementationSwitch } from '../implementation';
import { NextHomeDiscovery } from './internal/next/NextHomeDiscovery';
import {
  homeDiscoverySlotForUiSlotItem,
  type HomeDiscoverySlotId,
} from './internal/next/homeDiscoverySlots';

/**
 * The slots an assignment names that a Feed can fill, in its order. Items
 * without one (pinned Polymarket Events) are dropped, never borrowed from
 * another Venue. When none is left, the Venue's default slots apply, as the
 * renderer's bundled fallback does for an empty slot.
 */
const slotIdsFromReference = (
  reference: PredictHomepageMarketSlotReference | undefined,
): HomeDiscoverySlotId[] | undefined => {
  if (!reference) return undefined;
  const slotIds = reference.params.items.flatMap((item) => {
    const slotId = homeDiscoverySlotForUiSlotItem(item);
    return slotId ? [slotId] : [];
  });
  return slotIds.length > 0 ? slotIds : undefined;
};

const NextDiscoveryListWidget = ({ slot }: Readonly<{ slot?: UiSlot }>) => {
  const reference = slot?.dataReferences?.find(
    isPredictHomepageMarketSlotReference,
  );
  const slotIds = useMemo(() => slotIdsFromReference(reference), [reference]);
  return <NextHomeDiscovery slotIds={slotIds} />;
};

/**
 * The `predict-discovery-list` UI Slots widget. The legacy branch renders
 * the Polymarket discovery list unchanged. The next branch renders the
 * Active Venue's discovery for the slots the assignment names and the Venue
 * supports, and nothing for the rest.
 *
 * The widget registry imports this file directly, not the PredictNext entry
 * point: the entry point renders the Predictions section, which renders this
 * registry, so importing it back would load in a cycle.
 */
export const PredictDiscoveryListSlotWidget = ({
  slot,
}: Readonly<{ slot?: UiSlot }>) => (
  <PredictImplementationSwitch
    legacy={<PredictDiscoveryListWidget slot={slot} />}
    next={<NextDiscoveryListWidget slot={slot} />}
    resolving={null}
  />
);
