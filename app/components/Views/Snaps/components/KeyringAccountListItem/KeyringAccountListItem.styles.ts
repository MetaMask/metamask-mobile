///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingTop: 16,
      backgroundColor: colors.background.default,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      padding: 16,
    },
    textContent: {
      flex: 1,
    },
    addressText: {
      color: colors.text.default,
    },
    buttonContainer: {
      paddingLeft: 16,
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
