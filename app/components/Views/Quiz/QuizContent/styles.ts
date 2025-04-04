import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: { justifyContent: 'center' },
    modal: {
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
      alignItems: 'center',
      marginBottom: 20,
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
    image: {
      width: 300,
      height: 250,
    },
    bottomContainer: {
      width: '100%',
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
