import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    keyboardAvoidingView: {
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
      padding: 10,
      width: '100%',
    },
  });
};

export default styleSheet;
