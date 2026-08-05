import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: {
  theme: Theme;
  vars: { isPureBlack?: boolean };
}) => {
  const { theme, vars } = params;
  const { isPureBlack = false } = vars ?? {};
  const { colors } = theme;

  return StyleSheet.create({
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens / bg-elevated.
    // Drop usePureBlack() and the isPureBlack var. Use: backgroundColor: theme.colors.background.default
    modalView: {
      backgroundColor: isPureBlack
        ? theme.colors.background.section
        : theme.colors.background.default,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? colors.border.muted : undefined,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      ...theme.shadows.size.sm,
      elevation: 11,
      paddingVertical: 24,
    },
    closeModalBtn: {
      alignSelf: 'center',
      position: 'absolute',
      left: 0,
    },
    modalContent: {
      alignSelf: 'stretch',
      marginTop: 8,
      marginBottom: 30,
      marginHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContentValue: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    iconButton: {
      marginLeft: 4,
    },
  });
};

export type TooltipStylesType = ReturnType<typeof styleSheet>;
export default styleSheet;
