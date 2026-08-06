import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isCompact: boolean | undefined; isPureBlack: boolean };
}) => {
  const { theme, vars } = params;
  const { isCompact, isPureBlack } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isCompact ? 0 : 16,
      marginBottom: isCompact ? 0 : 8,
    },
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens / bg-elevated.
    // Drop usePureBlack() and the isPureBlack var. Use: backgroundColor: theme.colors.background.default
    modalContent: {
      backgroundColor: isPureBlack
        ? theme.colors.background.alternative
        : theme.colors.background.default,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? colors.border.muted : undefined,
      paddingBottom: 34,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    modalExpandedContent: {
      paddingHorizontal: 16,
    },
    copyButtonContainer: {
      position: 'absolute',
      top: 6,
      right: 18,
      zIndex: 1,
    },
  });
};

export default styleSheet;
