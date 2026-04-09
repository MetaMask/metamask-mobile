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
      backgroundColor: theme.colors.background.section,
      borderRadius: CARD_BORDER_RADIUS,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      padding: 16,
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
      marginHorizontal: 16,
      marginBottom: 16,
    },
    shimmerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.icon.alternative,
      borderRadius: CARD_BORDER_RADIUS,
    },
  });
};

export default styleSheet;
