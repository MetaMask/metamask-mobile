import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    section: {
      marginVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
      paddingVertical: 8,
    },
  });
};

export default styleSheet;
