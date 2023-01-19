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
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 16,
      minHeight: 426,
    },
    bodyContainer: {
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center', //Centered vertically
      marginTop: 20,
      marginHorizontal: 20,
    },
    headerText: {
      textAlign: 'center',
      flex: 4,
    },
    icon: {
      flex: 1,
    },
  });
};

export default styleSheet;
