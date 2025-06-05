import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    header: {
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 20,
      fontSize: 18,
      fontWeight: 'bold',
    },
    inputContainer: {
      marginVertical: 16,
    },
    label: {
      marginBottom: 8,
    },
    detailsContainer: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.default,
    },
    quoteSummary: {
      marginTop: 16,
      padding: 16,
      borderRadius: 8,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
    },
  });
};

export default styleSheet;
