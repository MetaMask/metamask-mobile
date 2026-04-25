import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    inputContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },

    disabledButton: {
      opacity: 0.5,
    },

    footerText: {
      alignSelf: 'center',
    },

    separator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
  });
};

export default styleSheet;
