import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    mainSection: {
      marginBottom: 24,
      gap: 8,
    },
    detailsContainer: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      padding: 16,
      gap: 16,
    },
    showBankInfoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    bottomContainer: {
      gap: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    button: {
      flex: 1,
    },
  });
};

export default styleSheet;
