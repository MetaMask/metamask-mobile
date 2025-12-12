/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyles = (colors: any) =>
  StyleSheet.create({
    forgotPasswordContainer: {
      flexDirection: 'column',
      rowGap: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
      padding: 16,
    },
    forgotPasswordPointsContainer: {
      flexDirection: 'column',
      rowGap: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
      marginVertical: 8,
    },
    forgotPasswordPoint: {
      flexDirection: 'row',
      columnGap: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
    },
    forgotPasswordPointText: {
      width: '90%',
    },
    container: {
      flexDirection: 'column',
      rowGap: 24,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
      paddingHorizontal: 16,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    areYouSure: {
      paddingVertical: 24,
      width: '100%',
      justifyContent: 'center',
      alignSelf: 'center',
      flexDirection: 'column',
      rowGap: 16,
    },
    iconContainer: {
      flexDirection: 'row',
      columnGap: 16,
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    iconEmptyContainer: {
      width: 24,
      height: 24,
    },
    warningIcon: {
      alignSelf: 'center',
    },
    heading: {
      textAlign: 'center',
      width: '80%',
      marginLeft: 'auto',
      marginRight: 'auto',
      ...fontStyles.bold,
    },
    red: {
      marginHorizontal: 24,
      color: colors.error.default,
    },
    warningText: {
      textAlign: 'left',
      width: '100%',
      fontFamily: 'Geist Medium',
    },
    warningTextContainer: {
      flexDirection: 'column',
      rowGap: 24,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
    },
    bold: {
      ...fontStyles.bold,
    },
    delete: {
      marginBottom: 20,
    },
    input: {
      fontFamily: fontStyles.normal.fontFamily,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
    deleteWarningMsg: {
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 10,
      color: colors.error.default,
    },
    inputContainer: {
      flexDirection: 'column',
      rowGap: 2,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
    },
    buttonContainer: {
      flexDirection: 'column',
      rowGap: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
      marginTop: 8,
    },
    deleteButton: {
      backgroundColor: colors.error.default,
    },
  });
