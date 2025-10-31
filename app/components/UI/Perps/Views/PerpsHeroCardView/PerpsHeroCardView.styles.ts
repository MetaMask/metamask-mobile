import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { darkTheme } from '@metamask/design-tokens';

/**
 * Note: DO NOT REPLACE darkTheme.colors occurrences with theme.colors in this file.
 * We intentionally use darkTheme in this file to ensure consistent styling regardless of device theme.
 * This way exported P&L cards are uniform.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: { isLong: boolean; hasReferralCode: boolean };
}) => {
  const { theme, vars } = params;
  const { isLong, hasReferralCode } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    safeAreaContainer: {
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
    carouselWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carousel: {
      width: 372,
      height: 340,
      alignSelf: 'center',
    },
    cardContainer: {
      width: 340,
      height: 340,
      marginHorizontal: 16,
      backgroundColor: darkTheme.colors.accent04.dark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: darkTheme.colors.accent04.normal,
      padding: 20,
      overflow: 'hidden',
    },
    backgroundImage: {
      position: 'absolute',
      left: 90,
      top: 30,
      width: '100%',
      height: '100%',
    },
    heroCardTopRow: {
      alignContent: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      width: '100%',
    },
    metamaskLogo: {
      alignContent: 'center',
      height: 23,
      width: 46,
      flexShrink: 0,
      tintColor: darkTheme.colors.text.default,
    },
    heroCardAssetRow: {
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
      alignItems: 'center',
      paddingHorizontal: 5,
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
    pnlPositive: {
      color: darkTheme.colors.success.default,
    },
    pnlNegative: {
      color: darkTheme.colors.error.default,
    },
    priceRowsContainer: {
      marginBottom: hasReferralCode ? 16 : 0,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceLabelContainer: {
      width: 36,
    },
    priceLabel: {
      color: darkTheme.colors.accent04.light,
    },
    priceValue: {
      color: darkTheme.colors.text.default,
    },
    carouselDotIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 16,
      gap: 4,
    },
    referralCodeTagContainer: {
      position: 'absolute',
      bottom: 60,
      left: 20,
    },
    referralCodeContentContainer: {
      position: 'absolute',
      bottom: 20,
      left: 20,
    },
    referralCodeText: {
      color: darkTheme.colors.accent04.light,
      width: 175,
      lineHeight: 16,
      position: 'absolute',
      bottom: 20,
      left: 20,
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.icon.muted,
      flexDirection: 'row',
    },
    progressDotActive: {
      width: 23,
      height: 12,
      borderRadius: 9,
      backgroundColor: theme.colors.icon.default,
    },
    footerButtonContainer: {
      padding: 16,
    },
  });
};

export default styleSheet;
