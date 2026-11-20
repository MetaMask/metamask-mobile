import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../../util/theme/models';

const CARD_BORDER_RADIUS = 12;

const styleSheet = (params: {
  theme: Theme;
  vars: { cardWidth: number; cardHeight: number };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    card: {
      width: vars.cardWidth,
      height: vars.cardHeight,
      backgroundColor: theme.colors.background.muted,
      borderRadius: CARD_BORDER_RADIUS,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      // 15 + 1px border keeps content where it was
      padding: 15,
    },
    tokenLogoWrapper: {
      position: 'relative' as const,
    },
    favoriteBadge: {
      position: 'absolute' as const,
      top: -6,
      right: -6,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 12,
      padding: 3,
    },
    sparklineContainer: {
      marginTop: 'auto' as const,
      marginHorizontal: 15,
      marginBottom: 15,
    },
    shimmerOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.icon.alternative,
      borderRadius: CARD_BORDER_RADIUS,
    },
  });
};

export default styleSheet;
