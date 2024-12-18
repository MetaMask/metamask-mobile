import type { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const stylesSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    mainContainer: {
      paddingTop: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background.alternative,
      height: '100%',
      justifyContent: 'space-between',
    },
    // Card styles
    cardsContainer: {
      paddingTop: 8,
      gap: 8,
    },
    card: {
      borderWidth: 0,
      gap: 16,
      borderRadius: 8,
    },
    estGasFeeCard: {
      borderWidth: 0,
      gap: 16,
      borderRadius: 8,
      justifyContent: 'center',
    },
    cardGroupTop: {
      borderWidth: 0,
      gap: 16,
      borderRadius: 8,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    cardGroupBottom: {
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderColor: colors.border.muted,
    },
    // Network
    networkKeyValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    // Estimated Gas Fee
    estGasFeeValue: {
      flexDirection: 'row',
      paddingTop: 1,
    },
    foxIcon: {
      paddingRight: 8,
    },
    fiatText: {
      paddingRight: 4,
    },
    ethText: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.primary.default,
    },
    estimatedGasTooltipContent: {
      gap: 16,
    },
    gasLearnMoreLink: {
      alignSelf: 'flex-start',
    },
    // Est. Annual Reward
    estAnnualRewardValue: {
      flexDirection: 'row',
      gap: 8,
    },
    // Tags
    tagMinimalPadding: {
      paddingLeft: 0,
      paddingRight: 8,
      paddingTop: 0,
      paddingBottom: 0,
    },
    // Terms of Service / Risk  Disclosure Button Group
    termsOfServiceButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    legalLink: {
      padding: 16,
    },
    // Footer Button Group
    footerButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      paddingTop: 24,
    },
    footerButton: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
    },
    footerContainer: {
      paddingBottom: 40,
    },
  });
};

export default stylesSheet;
