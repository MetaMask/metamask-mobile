import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailSection,
  ActivityDetailsAmountHeader,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsFeeRows,
  ActivityDetailsFooter,
  ActivityDetailsMetadata,
  ActivityDetailsTotalRow,
} from '../components';

/**
 * Reference per-type template for `send` / `receive` — the one concrete
 * template built in the foundation pass. Other kinds fall through to
 * `DefaultDetails`. A divider separates the on-chain metadata from the
 * amount/fiat values, and the footer is pinned to the bottom of the screen.
 */
export function SendDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'send' | 'receive' }>;
}) {
  return (
    <Box twClassName="flex-1">
      <ActivityDetailsAmountHeader item={item} />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsMetadata item={item} />
      <SectionDivider marginVertical={3} />
      <ActivityDetailSection>
        <ActivityDetailsFeeRows item={item} />
        <ActivityDetailsTotalRow item={item} />
      </ActivityDetailSection>
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>
          <ActivityDetailsBlockExplorerButton
            chainId={item.chainId}
            hash={item.hash}
          />
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
