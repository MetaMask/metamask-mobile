import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.overlay.default,
    },
    pickerContainer: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
    },
    touchableArea: {
      width: '100%',
    },
    dateTimePicker: {
      backgroundColor: theme.colors.background.default,
    },
  });
};

export default styleSheet;
