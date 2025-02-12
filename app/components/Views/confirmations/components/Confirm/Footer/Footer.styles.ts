import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    footerButton: {
      flex: 1,
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
