import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      color: theme.colors.text.default,
    },
    amount: {
      color: theme.colors.text.alternative,
    },
    progressBarContainer: {
      width: '100%',
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary.default,
      borderRadius: 3,
    },
    progressFillWarning: {
      backgroundColor: theme.colors.error.default,
    },
    warningContainer: {
      marginVertical: 8,
    },
    warningBanner: {
      backgroundColor: theme.colors.warning.muted,
      borderRadius: 8,
      padding: 12,
    },
    warningContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    warningText: {
      flex: 1,
      color: theme.colors.text.default,
      marginRight: 12,
    },
    warningButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    warningButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    warningButtonText: {
      color: theme.colors.primary.default,
      fontWeight: '600',
    },
  });

export default createStyles;
