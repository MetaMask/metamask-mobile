import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
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
    <Box
      marginTop={4}
      marginBottom={6}
      twClassName="w-full flex-col items-center justify-center gap-4"
    >
      <Box twClassName="self-center items-center">
        <ActivityDetailsAvatar
          tokens={[token ?? UNKNOWN_TOKEN_PLACEHOLDER]}
          chainId={chainId}
          showNetworkBadge
        />
      </Box>
      <Text variant={TextVariant.DisplayMd} twClassName="text-center">
        {tokenLabel}
      </Text>
    </Box>
  );
}
