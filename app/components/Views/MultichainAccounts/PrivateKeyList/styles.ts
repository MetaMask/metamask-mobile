import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    container: {
      padding: 16,
      flexGrow: 1,
      flexDirection: 'row',
      marginBottom: 50,
      maxHeight: '75%',
    },

    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },

    password: {
      marginHorizontal: 16,
      marginTop: 24,
    },

    buttons: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginTop: 16,
      marginBottom: 16,
    },

    button: {
      flex: 1,
      marginHorizontal: 8,
    },

    banner: {
      marginHorizontal: 10,
    },

    input: {
      backgroundColor: colors.background.default,
      fontSize: 20,
      color: colors.text.default,
      borderColor: colors.border.default,
      borderWidth: 1,
      borderRadius: 8,
      marginVertical: 8,
      paddingVertical: 16,
      paddingHorizontal: 16,
      ...fontStyles.normal,
    },

    sheet: {
      marginVertical: 16,
      marginHorizontal: 16,
    },

    bottomSheetContent: {
      backgroundColor: colors.background.default,
      display: 'flex',
    },
  });
};

export default styleSheet;
