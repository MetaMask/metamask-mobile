import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      marginTop: 24,
      marginBottom: 8,
    },
    description: {
      marginBottom: 16,
    },
    reviewPrompt: {
      marginBottom: 12,
    },
    detailsCard: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 4,
    },
    detailRow: {
      height: 'auto',
      minHeight: 40,
      paddingVertical: 8,
    },
    detailValue: {
      flexShrink: 1,
      textAlign: 'right',
    },
    supportNotice: {
      marginTop: 12,
    },
    consents: {
      marginTop: 24,
      marginBottom: 16,
      gap: 16,
    },
    richConsentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    richLabel: {
      flex: 1,
      marginLeft: 12,
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
