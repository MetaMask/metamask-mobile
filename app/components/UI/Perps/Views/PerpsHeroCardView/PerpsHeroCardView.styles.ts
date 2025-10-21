import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { darkTheme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme; vars: { isLong: boolean } }) => {
  const { theme, vars } = params;
  const { isLong } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentScrollView: {
      flex: 1,
    },
    cardWrapper: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardContainer: {
      backgroundColor: darkTheme.colors.accent04.dark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.info.default,
      padding: 24,
      gap: 16,
    },
    backgroundImage: {},
    logoContainer: {
      alignItems: 'flex-start',
    },
    logo: {
      height: 23,
      width: 46,
      flexShrink: 0,
      tintColor: darkTheme.colors.text.default,
      alignSelf: 'flex-start',
    },
    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    assetName: {
      color: darkTheme.colors.text.default,
      marginRight: 6,
    },
    assetIcon: {
      marginRight: 4,
    },
    directionBadge: {
      minWidth: 64,
      alignItems: 'center',
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: isLong
        ? darkTheme.colors.accent03.light
        : darkTheme.colors.error.default,
    },
    directionBadgeText: {
      color: isLong
        ? darkTheme.colors.accent03.dark
        : darkTheme.colors.text.default,
    },
    pnlText: {
      fontSize: 40,
      fontWeight: '600',
    },
    pnlPositive: {
      color: darkTheme.colors.success.default,
    },
    pnlNegative: {
      color: darkTheme.colors.error.default,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceLabel: {
      color: darkTheme.colors.accent04.light,
    },
    priceValue: {
      color: darkTheme.colors.text.default,
    },
    referralContainer: {
      marginTop: 24,
      alignItems: 'flex-start',
    },
    footerTextContainer: {
      paddingTop: 8,
    },
    footerText: {
      color: darkTheme.colors.text.default,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '500',
    },
    buttonsContainer: {
      padding: 16,
      gap: 12,
    },
  });
};

export default styleSheet;
