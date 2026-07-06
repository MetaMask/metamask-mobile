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

export function ActivityDetailsApprovalTokenSection({
  token,
}: {
  token?: TokenAmount;
}) {
  const tokenLabel = token?.symbol ?? strings('asset_details.token');

  return (
    <Box twClassName="flex-row items-center gap-3">
      {token ? (
        <ActivityDetailsAvatar tokens={[token]} size={AvatarTokenSize.Lg} />
      ) : null}
      <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Medium}>
        {tokenLabel}
      </Text>
    </Box>
  );
}
