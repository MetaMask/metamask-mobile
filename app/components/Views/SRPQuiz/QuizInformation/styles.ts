import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors } = theme;

  return StyleSheet.create({
    screen: { justifyContent: 'center' },
    // eslint-disable-next-line react-native/no-color-literals
    modal: {
      backgroundColor: 'blue',
      borderRadius: 10,
      marginHorizontal: 16,
    },
    bodyContainer: {
      padding: 24,
    },
    title: {
      textAlign: 'center',
      marginVertical: 12,
    },
    content: {
      textAlign: 'center',
      marginVertical: 12,
    },
    button: {
      marginVertical: 12,
    },
  });
};

export default styleSheet;
