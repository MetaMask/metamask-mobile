import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      position: 'relative',
      flexDirection: 'row',
      paddingTop: 8,
      paddingBottom: 16,
    },
    backButton: {
      position: 'absolute',
      left: 0,
      top: 10,
      zIndex: 1,
    },
    title: {
      color: theme.colors.text.default,
      textAlign: 'center',
      flex: 1,
    },
  });
};

export default styleSheet;
