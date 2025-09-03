import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

interface PerpsMarketHeaderStyles {
  container: ViewStyle;
  backButton: ViewStyle;
  perpIcon: ViewStyle;
  tokenIcon: ImageStyle;
  leftSection: ViewStyle;
  assetRow: ViewStyle;
  assetName: TextStyle;
  positionValueRow: ViewStyle;
  positionValue: TextStyle;
  priceChange24h: TextStyle;
  moreButton: ViewStyle;
}

export const styleSheet = ({
  theme,
}: {
  theme: Theme;
}): PerpsMarketHeaderStyles =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    backButton: {
      padding: 12,
      marginLeft: -12,
      marginTop: -12,
      marginBottom: -12,
    },
    perpIcon: {
      marginRight: 12,
    },
    tokenIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    leftSection: {
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
    positionValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    positionValue: {
      fontWeight: '700',
    },
    priceChange24h: {
      fontSize: 12,
    },
    moreButton: {
      padding: 4,
    },
  });
