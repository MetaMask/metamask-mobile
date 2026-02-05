import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    usernameContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    usernameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    noUsernameContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    noUsernameText: {
      marginBottom: 12,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    dangerSection: {
      borderWidth: 1,
      borderColor: colors.error.default,
      borderRadius: 8,
      padding: 16,
    },
    dangerDescription: {
      marginTop: 4,
      marginBottom: 16,
    },
    devSection: {
      borderWidth: 1,
      borderColor: colors.warning.default,
      borderRadius: 8,
      padding: 16,
      backgroundColor: colors.warning.muted,
    },
    devDescription: {
      marginTop: 4,
      marginBottom: 16,
    },
  });
};

export default styleSheet;
