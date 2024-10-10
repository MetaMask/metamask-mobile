import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      borderWidth: 1,
      padding: 8,
      marginBottom: 8,
    },
  });
};

export default styleSheet;
