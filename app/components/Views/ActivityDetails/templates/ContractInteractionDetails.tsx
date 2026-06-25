import React from 'react';
import { Image } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import transactionIconInteraction from '../../../../images/transaction-icons/interaction.png';
import { renderShortAddress } from '../../../../util/address';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

const CONTRACT_INTERACTION_ICON_SIZE = 40;

function ContractInteractionHero({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'contractInteraction' }>;
}) {
  const displayAddress = item.data.to || item.hash;

  return (
    <Box twClassName="flex-row items-center gap-3">
      <Image
        source={transactionIconInteraction}
        style={{
          width: CONTRACT_INTERACTION_ICON_SIZE,
          height: CONTRACT_INTERACTION_ICON_SIZE,
        }}
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
