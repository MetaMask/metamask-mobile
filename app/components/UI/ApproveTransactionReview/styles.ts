import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';
import scaling from '../../../util/scaling';
import Device from '../../../util/device';

const createStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      minWidth: '100%',
      width: '100%',
      paddingVertical: 10,
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(24),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 8,
      paddingHorizontal: 16,
    },
    tokenKey: {
      fontSize: 12,
      marginRight: 5,
    },
    tokenValue: {
      fontSize: 12,
      width: '75%',
    },
    explanation: {
      ...fontStyles.normal,
      fontSize: 14,
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    tokenAccess: {
      alignItems: 'center',
      marginHorizontal: 14,
      flexDirection: 'row',
    },
    editPermissionText: {
      ...fontStyles.bold,
      color: colors.primary.default,
      fontSize: 12,
      lineHeight: 20,
      textAlign: 'center',
      marginVertical: 10,
      borderWidth: 1,
      borderRadius: 20,
      borderColor: colors.primary.default,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    viewDetailsText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
      textAlign: 'center',
    },
    actionTouchable: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    addressWrapper: {
      backgroundColor: colors.primary.muted,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 40,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    address: {
      fontSize: 13,
      marginHorizontal: 8,
      color: colors.text.default,
      ...fontStyles.normal,
      maxWidth: 120,
    },
    errorWrapper: {
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    underline: {
      textDecorationLine: 'underline',
      ...fontStyles.bold,
    },
    actionViewWrapper: {
      height: Device.isMediumDevice() ? 200 : 280,
    },
    actionViewChildren: {
      height: 300,
    },
    actionViewQRObject: {
      height: 648,
    },
    paddingHorizontal: {
      paddingHorizontal: 16,
    },
    contactWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 15,
    },
    nickname: {
      ...fontStyles.normal,
      textAlign: 'center',
      color: colors.primary.default,
      marginBottom: 10,
    },
    actionIcon: {
      color: colors.primary.default,
    },
  });

export default createStyles;
