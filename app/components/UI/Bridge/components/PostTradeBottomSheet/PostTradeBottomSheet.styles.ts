import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    sheet: {
      paddingBottom: 0,
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    statusIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    loadingIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary.muted,
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    footer: {
      paddingTop: 8,
    },
  });

export default styleSheet;
