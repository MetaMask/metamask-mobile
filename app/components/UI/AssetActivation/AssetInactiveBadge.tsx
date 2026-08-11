import React from 'react';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

export const AssetInactiveBadgeTestIds = {
  BADGE: 'asset-inactive-badge',
} as const;

export const AssetInactiveBadge = () => (
  <Tag
    severity={TagSeverity.Warning}
    twClassName="rounded-full"
    testID={AssetInactiveBadgeTestIds.BADGE}
  >
    {strings('asset_activation.inactive')}
  </Tag>
);
