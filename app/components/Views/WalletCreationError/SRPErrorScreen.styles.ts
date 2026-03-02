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
      flexGrow: 1,
      padding: 16,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 48,
    },
    warningIcon: {
      marginBottom: 16,
    },
    title: {
      textAlign: 'center',
      marginBottom: 16,
    },
    infoBanner: {
      flexDirection: 'row',
      backgroundColor: colors.info.muted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 24,
      width: '100%',
    },
    infoBannerIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    infoBannerText: {
      flex: 1,
    },
    errorReportContainer: {
      width: '100%',
      marginBottom: 24,
    },
    errorReportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    errorReportContent: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
      maxHeight: 200,
    },
    buttonContainer: {
      width: '100%',
      paddingTop: 16,
      paddingBottom: 24,
    },
    button: {
      marginBottom: 16,
    },
  });
};

export default styleSheet;
