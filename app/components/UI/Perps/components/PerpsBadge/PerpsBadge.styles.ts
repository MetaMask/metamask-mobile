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

  // Badge color mapping following design system pattern:
  // Background uses .muted variant, text uses .default variant from same color family
  // This ensures proper contrast while maintaining semantic color consistency
  // Pattern inspired by AvatarIcon component (primary.muted background + primary.default icon)
  const badgeStyles: Record<
    BadgeType,
    { background: string; text: string; border?: string }
  > = {
    experimental: {
      background: theme.colors.primary.muted,
      text: theme.colors.primary.default,
    },
    dex: {
      background: theme.colors.background.default,
      text: theme.colors.text.alternative,
      border: theme.colors.border.default,
    },
    equity: {
      background: theme.colors.info.muted,
      text: theme.colors.info.default,
    },
    commodity: {
      background: theme.colors.success.muted,
      text: theme.colors.success.default,
    },
    crypto: {
      background: theme.colors.primary.muted,
      text: theme.colors.primary.default,
    },
    forex: {
      background: theme.colors.error.muted,
      text: theme.colors.error.default,
    },
  };

  const style = badgeStyles[type] || {
    background: theme.colors.background.alternative,
    text: theme.colors.text.default,
  };

  return StyleSheet.create({
    badge: {
      marginLeft: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: style.background,
      alignSelf: 'flex-start',
      ...(style.border && {
        borderWidth: 1,
        borderColor: style.border,
      }),
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: style.text,
      letterSpacing: 0.5,
    },
  });
};
