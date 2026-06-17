///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import Tag from '../../../component-library/components/Tags/Tag';
import { strings } from '../../../../locales/i18n';

export const StellarTrustlineInactiveBadgeTestIds = {
  BADGE: 'stellar-trustline-inactive-badge',
} as const;

export const StellarTrustlineInactiveBadge = () => (
  <Tag
    label={strings('stellarTrustlineInactive')}
    testID={StellarTrustlineInactiveBadgeTestIds.BADGE}
  />
);
///: END:ONLY_INCLUDE_IF
