import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isPureBlack: boolean };
}) => {
  const { theme, vars } = params;
  const { isPureBlack } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens / bg-elevated.
    // Drop usePureBlack() and the isPureBlack var. Use: backgroundColor: theme.colors.background.default
    container: {
      backgroundColor: isPureBlack
        ? theme.colors.background.alternative
        : theme.colors.background.default,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? colors.border.muted : undefined,
      padding: 16,
      paddingBottom: 36,
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    button: {
      flex: 1,
    },
    description: {
      marginBottom: 16,
    },
    title: {
      marginBottom: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    balanceInfo: {
      marginTop: 16,
      marginBottom: 24,
    },
  });
};

export default styleSheet;
