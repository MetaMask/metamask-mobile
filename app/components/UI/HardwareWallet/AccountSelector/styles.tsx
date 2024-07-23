/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import Device from '../../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyle = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 32,
    },
    title: {
      marginTop: 40,
      fontSize: 24,
      marginBottom: 24,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    account: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    checkBox: {
      backgroundColor: colors.background.default,
    },
    number: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    pagination: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
    },
    paginationText: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.primary.default,
      paddingHorizontal: 10,
    },
    paginationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
    },
    bottom: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 30,
      paddingBottom: Device.isIphoneX() ? 20 : 10,
    },
    button: {
      width: '100%',
      justifyContent: 'flex-end',
      paddingTop: 15,
    },
  });
