/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

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
      paddingBottom: 12,
      backgroundColor: colors.background.default,
    },
    descriptionContainer: {
      marginTop: 4,
    },
    bottom: {
      width: '100%',
      marginTop: 20,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    input: {
      backgroundColor: colors.background.default,
      fontSize: 14,
      borderRadius: 6,
      height: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      ...fontStyles.normal,
      color: colors.text.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 16,
    },
  });

export { createStyles };
