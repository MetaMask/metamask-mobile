import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import {
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsFeesAndTotal,
  ActivityDetailsFeeRows,
  ActivityDetailsFooter,
  ActivityDetailsMetadata,
} from '../components';

export function ActivityDetailsStandardTemplate({
  item,
  header,
  token,
  fiatOnly,
  showFeesAndTotal = true,
  showTotal = true,
  addressRows,
}: {
  item: ActivityListItem;
  header: React.ReactNode;
  token?: TokenAmount;
  fiatOnly?: boolean;
  showFeesAndTotal?: boolean;
  showTotal?: boolean;
  addressRows?: { from?: string; to?: string };
}) {
  return (
    <Box twClassName="flex-1">
      {header}
      <SectionDivider marginVertical={3} />
      <ActivityDetailsMetadata item={item} addressRows={addressRows} />
      {showFeesAndTotal ? (
        <>
          <SectionDivider marginVertical={3} />
          {showTotal ? (
            <ActivityDetailsFeesAndTotal
              item={item}
              token={token}
              fiatOnly={fiatOnly}
            />
          ) : (
            <ActivityDetailsFeeRows item={item} />
          )}
        </>
      ) : null}
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
