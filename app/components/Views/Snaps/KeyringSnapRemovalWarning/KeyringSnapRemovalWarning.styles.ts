///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    description: {
      paddingTop: 16,
    },
    buttonContainer: {
      paddingTop: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 4,
      padding: 10,
      marginVertical: 10,
    },
    errorText: {
      color: colors.error.default,
    },
    placeholderText: {
      color: colors.text.muted,
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
