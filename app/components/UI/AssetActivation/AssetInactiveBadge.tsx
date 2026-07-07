///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import Tag from '../../../component-library/components/Tags/Tag';
import { strings } from '../../../../locales/i18n';

export const AssetInactiveBadgeTestIds = {
  BADGE: 'asset-inactive-badge',
} as const;

export const AssetInactiveBadge = () => (
  <Tag
    label={strings('asset_activation.inactive')}
    testID={AssetInactiveBadgeTestIds.BADGE}
  />
);
///: END:ONLY_INCLUDE_IF
