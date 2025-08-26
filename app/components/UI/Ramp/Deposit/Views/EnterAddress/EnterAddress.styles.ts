import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    textContainer: {
      marginTop: 24,
      marginBottom: 16,
      gap: 8,
    },
    subtitle: {
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
    countryPrefix: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryFlag: {
      fontSize: 16,
    },
    countryName: {
      fontSize: 14,
      color: theme.colors.text.muted,
      marginLeft: 4,
    },
    errorContainer: {
      marginVertical: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.default,
      marginBottom: 6,
    },
  });
};

export default styleSheet;
