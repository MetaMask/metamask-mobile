/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    topOverlay: {
      flex: 1,
    },
    wrapper: {
      flexGrow: 1,
    },
    scanPkeyRow: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    descriptionContainer: {
      marginTop: 4,
    },
    bottom: {
      width: '100%',
      paddingHorizontal: 16,
    },
    input: {
      height: 120,
      backgroundColor: colors.background.section,
      borderWidth: 0,
      alignItems: 'flex-start',
      paddingVertical: 16,
    },
  });

export { createStyles };
