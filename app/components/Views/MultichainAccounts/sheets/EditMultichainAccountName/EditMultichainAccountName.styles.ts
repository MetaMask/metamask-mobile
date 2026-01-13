import { Theme } from '../../../../../util/theme/models';
import { Platform, StatusBar, StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    safeArea: {
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      flex: 1,
      backgroundColor: colors.background.default,
    },
    keyboardAvoidingView: {
      flex: 1,
      justifyContent: 'space-between',
    },
    contentContainer: {
      marginTop: 16,
      paddingLeft: 24,
      paddingRight: 24,
      gap: 16,
    },
    input: {
      borderRadius: 8,
      borderWidth: 2,
      width: '100%',
      borderColor: colors.border.default,
      padding: 10,
      height: 40,
      color: colors.text.default,
    },
    saveButtonContainer: {
      paddingHorizontal: 24,
      marginTop: 16,
      paddingVertical: 10,
      width: '100%',
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },
  });
};

export default styleSheet;
