import React from 'react';
import { useSelector } from 'react-redux';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  AvatarTokenSize,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { useActivityListItemRowContent } from '../../../UI/ActivityListItemRow/useActivityListItemRowContent';
import { useNftActivityImage } from '../../../UI/ActivityListItemRow/useNftActivityImage';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsAvatar } from './ActivityDetailsAvatar';
import { formatActivityTokenAmount } from './activityTokenFormat';

/**
 * Single amount header: token avatar(s) above a large primary amount with an
 * optional secondary (fiat/source) amount beneath. Reuses the redesigned row's
 * content resolver so the amounts match what the list row showed.
 */
export function ActivityDetailsAmountHeader({
  item,
}: {
  item: ActivityListItem;
}) {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const bridgeHistoryItem: BridgeHistoryItem | undefined = item.hash
    ? bridgeHistory[item.hash]
    : undefined;
  const content = useActivityListItemRowContent(
    item,
    item.chainId,
    bridgeHistoryItem,
  );
  const nftImageUrl = useNftActivityImage(item);

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}
    >
      <ActivityDetailsAvatar
        tokens={content.avatarTokens}
        chainId={item.chainId}
        showNetworkBadge
        iconUrl={content.avatarIconUrl ?? nftImageUrl}
      />
      <Box twClassName="shrink">
        {content.primaryAmount ? (
          <Text
            variant={TextVariant.DisplayMd}
            color={
              content.primaryToken?.direction === 'in'
                ? TextColor.SuccessDefault
                : TextColor.TextDefault
            }
          >
            {content.primaryAmount}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

function AssetLine({ label, token }: { label: string; token: TokenAmount }) {
  const amount = formatActivityTokenAmount(token);

  return (
    <Box twClassName="gap-1">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Box twClassName="flex-row items-center gap-3">
        <ActivityDetailsAvatar tokens={[token]} size={AvatarTokenSize.Lg} />
        {amount ? (
          <Text
            variant={TextVariant.HeadingMd}
            color={
              token.direction === 'in'
                ? TextColor.SuccessDefault
                : TextColor.TextDefault
            }
          >
            {amount}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

/**
 * Dual amount header: stacked "You sent" / "You received" asset lines, for
 * swap/bridge-style transactions. Either side is optional.
 */
export function ActivityDetailsDualAmountHeader({
  sentToken,
  receivedToken,
  sentLabel = strings('activity_details.you_sent'),
  receivedLabel = strings('activity_details.you_received'),
}: {
  sentToken?: TokenAmount;
  receivedToken?: TokenAmount;
  sentLabel?: string;
  receivedLabel?: string;
}) {
  if (!sentToken && !receivedToken) {
    return null;
  }

  return (
    <Box twClassName="gap-4" testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}>
      {sentToken ? <AssetLine label={sentLabel} token={sentToken} /> : null}
      {receivedToken ? (
        <AssetLine label={receivedLabel} token={receivedToken} />
      ) : null}
    </Box>
  );
}
