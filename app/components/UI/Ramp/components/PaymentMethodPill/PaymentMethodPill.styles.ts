import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 100,
      padding: 8,
    },
    label: {
      marginLeft: 8,
      marginRight: 4,
    },
    arrowWrapper: {
      padding: 4,
    },
    iconWrapper: {
      padding: 4,
    },
  });
};

export default styleSheet;
