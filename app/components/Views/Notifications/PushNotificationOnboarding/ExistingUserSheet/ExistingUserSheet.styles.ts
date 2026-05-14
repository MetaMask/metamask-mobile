import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.text.default,
      marginBottom: 12,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      color: colors.text.default,
      marginBottom: 24,
    },
    consentCard: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    consentCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 24,
      marginBottom: 8,
    },
    consentCardDescription: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.text.alternative,
      lineHeight: 21,
    },
    buttonsContainer: {
      gap: 12,
    },
    button: {
      borderRadius: 12,
    },
  });

export default createStyles;
