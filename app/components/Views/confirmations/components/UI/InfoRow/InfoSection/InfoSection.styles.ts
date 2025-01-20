import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
    },
  });
};

export default styleSheet;
