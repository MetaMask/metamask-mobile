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
      textAlign: 'center',
    },
    closeButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carouselInnerContainer: {
      width: 340,
      height: 340,
      alignSelf: 'center',
    },
    cardWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 16,
      gap: 4,
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: darkTheme.colors.background.muted,
    },
    progressDotActive: {
      width: 23,
      height: 12,
      borderRadius: 9,
      backgroundColor: darkTheme.colors.text.default,
    },
    cardContainer: {
      width: 340,
      height: 340,
      backgroundColor: darkTheme.colors.accent04.dark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.info.default,
      padding: 20,
      overflow: 'hidden',
    },
    backgroundImage: {
      position: 'absolute',
      left: 90,
      top: 40,
      width: '100%',
      height: '100%',
    },
    topRow: {
      alignContent: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      width: '100%',
    },
    logo: {
      alignContent: 'center',
      height: 23,
      width: 46,
      flexShrink: 0,
      tintColor: darkTheme.colors.text.default,
    },
    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
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
        ? darkTheme.colors.success.muted
        : darkTheme.colors.error.muted,
    },
    directionBadgeText: {
      color: isLong
        ? darkTheme.colors.success.default
        : darkTheme.colors.error.default,
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
    priceRowsContainer: {
      marginBottom: 16,
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
    qrCodeContainer: {
      alignSelf: 'flex-start',
    },
    buttonsContainer: {
      padding: 16,
    },
  });
};

export default styleSheet;
