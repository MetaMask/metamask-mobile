import React from 'react';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CardUkMigrationUpdateBadgeSelectors } from './CardUkMigrationUpdateBadge.testIds';

type CardUkMigrationUpdateBadgeSeverity = 'info' | 'warning' | 'danger';

export interface CardUkMigrationUpdateBadgeProps {
  severity: CardUkMigrationUpdateBadgeSeverity;
  testID?: string;
}

const TAG_SEVERITY: Record<CardUkMigrationUpdateBadgeSeverity, TagSeverity> = {
  info: TagSeverity.Info,
  warning: TagSeverity.Warning,
  danger: TagSeverity.Danger,
};

/**
 * "Update" tag for the Accounts menu MetaMask Card row during UK (Baanx) migration.
 * Uses design-system Tag (`rounded-md`), not TagBase pill.
 */
const CardUkMigrationUpdateBadge = ({
  severity,
  testID = CardUkMigrationUpdateBadgeSelectors.BADGE,
}: CardUkMigrationUpdateBadgeProps) => (
  <Tag severity={TAG_SEVERITY[severity]} testID={testID}>
    {strings('accounts_menu.card_update_badge')}
  </Tag>
);

export default CardUkMigrationUpdateBadge;
