import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    confirmButton: {
      flex: 1,
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
      padding: 16,
    },
    buttonDivider: {
      width: 8,
    },
  });
};

export default styleSheet;
