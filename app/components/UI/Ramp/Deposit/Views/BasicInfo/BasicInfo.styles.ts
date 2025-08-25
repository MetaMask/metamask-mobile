import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      marginTop: 24,
      marginBottom: 4,
    },
    subtitle: {
      marginBottom: 16,
      color: theme.colors.text.alternative,
    },
    nameInputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    nameInputContainer: {
      flex: 1,
    },
    calendarIcon: {
      color: theme.colors.icon.default,
    },
    footerContent: {
      gap: 8,
    },
    ssnLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorContainer: {
      marginVertical: 8,
    },
  });
};

export default styleSheet;
