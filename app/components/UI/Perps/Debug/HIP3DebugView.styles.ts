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
    scrollView: {
      flex: 1,
    },
    subtitle: {
      marginTop: 4,
      color: colors.text.alternative,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    sectionTitle: {
      marginBottom: 12,
      fontWeight: 'bold',
    },
    button: {
      backgroundColor: colors.primary.default,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    buttonText: {
      color: colors.primary.inverse,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.text.default,
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
    successBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.success.muted,
      borderRadius: 8,
    },
    successText: {
      color: colors.success.default,
    },
    subAccountSection: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.success.default,
    },
    subAccountItem: {
      marginTop: 4,
      paddingLeft: 8,
    },
  });
};

export default styleSheet;
