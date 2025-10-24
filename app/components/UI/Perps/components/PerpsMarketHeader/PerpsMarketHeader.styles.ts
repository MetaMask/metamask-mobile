import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

interface PerpsMarketHeaderStyles {
  container: ViewStyle;
  backButton: ViewStyle;
  perpIcon: ViewStyle;
  tokenIcon: ViewStyle;
  leftSection: ViewStyle;
  assetRow: ViewStyle;
  secondRow: ViewStyle;
  assetName: TextStyle;
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
      marginBottom: 2,
    },
    secondRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    assetName: {
      fontWeight: '600',
    },
    moreButton: {
      padding: 4,
    },
  });
