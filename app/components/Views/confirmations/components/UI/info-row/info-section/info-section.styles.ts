import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 8,
      paddingTop: 12,
      paddingBottom: 8,
      paddingHorizontal: 8,
      marginBottom: 8,
    },
  });
};

export default styleSheet;
