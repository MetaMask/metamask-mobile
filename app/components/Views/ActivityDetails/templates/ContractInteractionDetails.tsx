import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { renderShortAddress } from '../../../../util/address';
import type { ActivityListItem } from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's icon resolver; route-isolation backlog
import { resolveTransactionIconName } from '../../../UI/ActivityListItemRow/resolveIconType';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

function ContractInteractionHero({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'contractInteraction' }>;
}) {
  const displayAddress = item.data.to || item.hash;
  const isFailed = item.status === 'failed' || item.status === 'cancelled';

  return (
    <Box twClassName="flex-row items-center gap-3">
      {/* Match the list row's fallback avatar (same DS AvatarIcon + resolver). */}
      <AvatarIcon
        iconName={resolveTransactionIconName(item.type)}
        severity={
          isFailed ? AvatarIconSeverity.Danger : AvatarIconSeverity.Neutral
        }
        size={AvatarIconSize.Lg}
      />
      {displayAddress ? (
        <Text variant={TextVariant.DisplayMd}>
          {renderShortAddress(displayAddress)}
        </Text>
      ) : null}
    </Box>
  );
}

export function ContractInteractionDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'contractInteraction' }>;
}) {
  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ContractInteractionHero item={item} />}
      token={item.data.token}
      fiatOnly
    />
  );
}
