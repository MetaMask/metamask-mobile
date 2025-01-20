import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { hasError: boolean } }) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    confirmButton: {
      flex: 1,
      backgroundColor: vars.hasError
        ? theme.colors.error.default
        : theme.colors.primary.default,
    },
    rejectButton: {
      flex: 1,
      backgroundColor: theme.colors.background.alternative,
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
