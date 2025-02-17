import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { confirmDisabled: boolean };
}) => {
  const {
    theme,
    vars: { confirmDisabled },
  } = params;

  return StyleSheet.create({
    rejectButton: {
      flex: 1,
    },
    confirmButton: {
      flex: 1,
      opacity: confirmDisabled ? 0.5 : 1,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    buttonDivider: {
      width: 8,
    },
  });
};

export default styleSheet;
