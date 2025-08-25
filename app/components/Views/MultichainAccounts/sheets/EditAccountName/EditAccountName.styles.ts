import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 36,
      paddingLeft: 24,
      paddingRight: 24,
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
    saveButton: {
      flex: 1,
      marginLeft: 8,
      marginRight: 8,
    },
    footer: {
      paddingLeft: 16,
      paddingRight: 16,
    },
  });
};

export default styleSheet;
