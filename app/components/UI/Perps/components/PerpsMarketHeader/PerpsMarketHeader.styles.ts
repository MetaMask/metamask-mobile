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
  fullscreenButton: ViewStyle;
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
      paddingLeft: 8,
      paddingRight: 12,
      paddingVertical: 16,
      backgroundColor: theme.colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    backButton: {
      padding: 4,
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
      flexShrink: 1,
    },
    fullscreenButton: {
      padding: 4,
      marginRight: 4,
    },
    moreButton: {
      padding: 4,
    },
  });
