import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background.alternative,
    },
    mainContainer: {
      backgroundColor: theme.colors.background.alternative,
      paddingTop: 8,
      paddingBottom: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      justifyContent: 'space-between',
    },
    contentContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      width: '100%',
      paddingRight: 8,
      marginBottom: 8,
    },
    headerSpacer: {
      flex: 1,
    },
    warningIconContainer: {
      marginBottom: 16,
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
    },
    urlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 4,
    },
    urlText: {
      flexShrink: 1,
    },
    warningBox: {
      borderRadius: 8,
      padding: 12,
      width: '100%',
      marginBottom: 24,
    },
    buttonContainer: {
      paddingHorizontal: 16,
    },
    connectAnywayButton: {
      width: '100%',
    },
  });
};

export default createStyles;
