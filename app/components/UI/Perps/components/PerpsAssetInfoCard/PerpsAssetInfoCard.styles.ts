import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

interface PerpsAssetInfoCardStyles {
  container: ViewStyle;
  logoContainer: ViewStyle;
  tokenIcon: ViewStyle;
  infoSection: ViewStyle;
  assetRow: ViewStyle;
  assetName: TextStyle;
  priceRow: ViewStyle;
}

export const styleSheet = ({
  theme,
}: {
  theme: Theme;
}): PerpsAssetInfoCardStyles =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.background.default,
    },
    logoContainer: {
      marginRight: 12,
    },
    tokenIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    infoSection: {
      flex: 1,
      justifyContent: 'center',
    },
    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    assetName: {
      fontWeight: '600',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
  });
