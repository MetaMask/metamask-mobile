import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

interface PredictionSectionStylesVars {
  activeIndex: number;
  cardWidth: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: PredictionSectionStylesVars;
}) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    carouselItem: {
      width: params.vars.cardWidth * 0.8,
      borderRadius: 16,
      paddingHorizontal: 8,
      overflow: 'hidden',
      borderColor: colors.border.default,
      shadowColor: colors.shadow.default,
    },
    carouselItemLast: {
      width: params.vars.cardWidth,
      borderRadius: 16,
      paddingHorizontal: 8,
      overflow: 'hidden',
      borderColor: colors.border.default,
      shadowColor: colors.shadow.default,
    },
    carouselContentContainer: {
      paddingRight: 16,
    },
    paginationContainer: {
      marginTop: 16,
      gap: 8,
    },
    dot: {
      height: 8,
      width: 8,
      borderRadius: 4,
      backgroundColor: colors.border.muted,
    },
    dotActive: {
      height: 8,
      width: 24,
      borderRadius: 4,
      backgroundColor: colors.text.default,
    },
  });
};

export default styleSheet;
