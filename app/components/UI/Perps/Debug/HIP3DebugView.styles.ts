import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    subtitle: {
      marginTop: 4,
      color: colors.text.alternative,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      fontSize: 14,
      color: colors.text.default,
      backgroundColor: colors.background.default,
    },
    button: {
      backgroundColor: colors.primary.default,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: colors.primary.inverse,
    },
    loader: {
      marginTop: 12,
    },
    errorBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
    },
    errorText: {
      color: colors.error.default,
    },
    resultBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      maxHeight: 300,
    },
    resultText: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: colors.text.default,
    },
  });
};

export default styleSheet;
