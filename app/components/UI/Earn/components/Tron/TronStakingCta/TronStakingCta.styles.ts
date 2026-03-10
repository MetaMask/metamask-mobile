import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.section,
    },
    ctaContent: {
      alignItems: 'center',
      marginBottom: 16,
      gap: 4,
    },
    ctaTitle: {
      textAlign: 'center',
    },
    ctaText: {
      textAlign: 'center',
    },
    earnButton: {
      width: '100%',
    },
  });

export default styleSheet;
