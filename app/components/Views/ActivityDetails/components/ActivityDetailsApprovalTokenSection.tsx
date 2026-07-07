import React from 'react';
import {
  AvatarTokenSize,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { ActivityDetailsAvatar } from './ActivityDetailsAvatar';

const UNKNOWN_TOKEN_PLACEHOLDER: TokenAmount = { direction: 'out' };

export function ActivityDetailsApprovalTokenSection({
  token,
  chainId,
  capLabel,
}: {
  token?: TokenAmount;
  chainId?: string;
  capLabel?: string;
}) {
  const tokenLabel = token?.symbol
    ? (capLabel ?? token.symbol)
    : strings('activity_details.unknown_token');

  return (
    <Box twClassName="flex-row items-center gap-3">
      <ActivityDetailsAvatar
        tokens={[token ?? UNKNOWN_TOKEN_PLACEHOLDER]}
        size={AvatarTokenSize.Lg}
        chainId={chainId}
        showNetworkBadge
      />
      <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Medium}>
        {tokenLabel}
      </Text>
    </Box>
  );
}
