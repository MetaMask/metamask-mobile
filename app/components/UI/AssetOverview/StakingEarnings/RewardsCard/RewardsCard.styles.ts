import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    rewardsCard: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '50%',
      gap: 4,
    },
    rewardsCardTitle: {
      ...typography.sBodySM,
      letterSpacing: 0.25,
    } as TextStyle,
    rewardsCardAmount: {
      ...typography.sBodyMDBold,
    } as TextStyle,
    rewardsCardFooterText: {
      ...typography.sBodySM,
      color: colors.text.alternative,
      letterSpacing: 0.25,
    } as TextStyle,
  });
};

export default styleSheet;
