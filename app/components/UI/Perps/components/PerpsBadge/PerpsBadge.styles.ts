import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import type { BadgeType } from './PerpsBadge.types';

export const styleSheet = (params: {
  theme: Theme;
  vars: { type: BadgeType };
}) => {
  const {
    theme,
    vars: { type },
  } = params;

  // Badge color mapping
  const badgeColors: Record<BadgeType, string> = {
    experimental: theme.colors.primary.default,
    equity: theme.colors.warning.default,
    commodity: theme.colors.success.muted,
    crypto: theme.colors.info.default,
    forex: theme.colors.error.muted,
  };

  const backgroundColor =
    badgeColors[type] || theme.colors.background.alternative;

  return StyleSheet.create({
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text.alternative,
      letterSpacing: 0.5,
    },
  });
};
