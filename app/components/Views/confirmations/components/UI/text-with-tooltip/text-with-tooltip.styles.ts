import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: {
  theme: Theme;
  vars: { isPureBlack: boolean };
}) => {
  const { theme, vars } = params;
  const { isPureBlack } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    backIcon: {
      left: 10,
      top: 10,
      position: 'absolute',
    },
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens / bg-elevated.
    // Drop usePureBlack() and the isPureBlack var. Use: backgroundColor: theme.colors.background.default
    container: {
      backgroundColor: isPureBlack
        ? theme.colors.background.section
        : theme.colors.background.default,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? colors.border.muted : undefined,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    text: {
      ...fontStyles.normal,
    },
    tooltipHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    tooltipContext: {
      paddingHorizontal: 40,
      paddingTop: 40,
      paddingBottom: 56,
    },
  });
};

export default styleSheet;
