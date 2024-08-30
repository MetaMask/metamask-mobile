import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    sectionTitle: {
      ...typography.sHeadingSM,
      marginBottom: 4,
    } as TextStyle,
    sectionSubtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    rewardRate: {
      ...typography.sBodySM,
      color: colors.success.default,
      letterSpacing: 0.25,
    } as TextStyle,
    contentContainer: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      marginBottom: 12,
    },
    stakingOverviewContainer: { marginBottom: 16 },
    stakedAmountEth: {
      marginBottom: 8,
    } as TextStyle,
    fiatAndPercentageTitle: {
      ...typography.sBodySM,
      letterSpacing: 0.25,
      marginBottom: 4,
    } as TextStyle,
    fiatAndPercentageText: {
      ...typography.sBodySM,
      color: colors.text.alternative,
      letterSpacing: 0.25,
    } as TextStyle,
    fiatAndPercentageContainer: {
      flexDirection: 'row',
      gap: 4,
    },
    buttonWrapper: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    button: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '50%',
    },
    bannerGroupContainer: {
      gap: 8,
    },
    rewardCardsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
  });
};

export default styleSheet;
