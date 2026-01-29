import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      color: colors.text.default,
      marginBottom: 4,
    },
    subtitle: {
      color: colors.text.alternative,
    },
    versionBadge: {
      marginTop: 8,
      backgroundColor: colors.primary.muted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    versionText: {
      color: colors.primary.default,
    },
    infoBox: {
      backgroundColor: colors.background.alternative,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    infoText: {
      color: colors.text.alternative,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      color: colors.text.default,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary.default,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: colors.background.alternative,
    },
    buttonText: {
      color: colors.primary.inverse,
    },
    buttonTextDisabled: {
      color: colors.text.muted,
    },
  });
};

export default styleSheet;
