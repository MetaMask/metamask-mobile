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
    container: {
      padding: 15,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center', //Centered vertically
      marginBottom: 20,
      // marginHorizontal: 20,
    },
    headerText: {
      textAlign: 'center',
      flex: 18,
      color: colors.text.muted,
    },
    icon: {
      flex: 1,
    },
    spacer: {
      flex: 1,
    },
    title: {
      textAlign: 'center',
      marginVertical: 12,
    },
    content: {
      textAlign: 'center',
      marginVertical: 12,
      width: '100%',
    },
    bottomContainer: {
      width: '100%',
      // justifyContent: 'flex-end',
      marginTop: 25,
      marginBottom: 10,
    },
    button: {
      marginTop: 10,
      marginBottom: 5,
      width: '100%',
    },
  });
};

export default styleSheet;
