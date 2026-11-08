import React from 'react';
import { useEntryOutcomeName } from '../../../../hooks/useEntryOutcomeName';
import { useNextVenueId } from '../../../../implementation';
import type { PredictSettlementListItem } from '../../legacy/details/PredictDetails.types';
import { PredictSettlementDetails } from '../../legacy/details/PredictSettlementDetails';
import { useNextActivityEntry } from '../useNextActivityEntry';

/**
 * Details for a canonical Settlement through the shared Settlement template.
 * The item already carries everything the template shows; the canonical entry,
 * when loaded, only names a threshold line's Outcome with its line.
 */
export function NextSettlementDetails({
  item,
}: Readonly<{ item: PredictSettlementListItem }>) {
  const venueId = useNextVenueId();
  const { entry } = useNextActivityEntry(venueId, item.hash);
  const outcome = useEntryOutcomeName(
    entry?.type === 'settlement' ? entry : undefined,
  );

  return (
    <PredictSettlementDetails
      item={
        outcome === undefined
          ? item
          : { ...item, data: { ...item.data, outcomeLabel: outcome } }
      }
    />
  );
}
