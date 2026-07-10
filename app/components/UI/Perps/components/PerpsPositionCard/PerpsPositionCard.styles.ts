import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

interface StyleSheetParams {
  theme: Theme;
  iconSize?: number;
}

const styleSheet = (params: StyleSheetParams) => {
  const { theme, iconSize = 40 } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
    },
    // Compact mode styles
    compactCard: {
      paddingVertical: 8,
    },
    compactContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    compactLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    compactIcon: {
      marginRight: 12,
    },
    compactInfo: {
      flex: 1,
    },
    compactNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    compactRight: {
      alignItems: 'flex-end',
    },
    tpSlSkeleton: {
      width: 80,
      height: 14,
      borderRadius: 4,
      backgroundColor: colors.background.alternative,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    positionGrid: {
      gap: 12,
      marginBottom: 12,
    },
    positionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    positionItem: {
      flex: 1,
    },
    detailsSection: {
      marginLeft: 16,
    },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background.alternative,
      padding: 2,
      justifyContent: 'center',
    },
    toggleEnabled: {
      backgroundColor: colors.primary.default,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.background.default,
      shadowColor: colors.shadow.default,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    toggleThumbEnabled: {
      alignSelf: 'flex-end',
    },
    detailsSection: {
      marginTop: 20,
    },
    detailsTitle: {
      marginBottom: 16,
    },
    detailsGrid: {
      gap: 12,
    },
    detailsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    detailsItem: {
      flex: 1,
    },
    liquidationPriceValue: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
  });
};

export default styleSheet;
