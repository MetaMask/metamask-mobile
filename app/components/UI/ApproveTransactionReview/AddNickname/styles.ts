import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    headerWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 15,
      marginVertical: 5,
      paddingVertical: 10,
    },
    icon: {
      position: 'absolute',
      right: 0,
      padding: 10,
      color: colors.icon.default,
    },
    headerText: {
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 15,
    },
    addressWrapperPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    addressWrapper: {
      backgroundColor: colors.primary.muted,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 40,
      paddingVertical: 10,
      paddingHorizontal: 15,
      width: '90%',
    },
    address: {
      fontSize: 12,
      color: colors.text.default,
      letterSpacing: 0.8,
      marginLeft: 10,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 12,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      color: colors.text.default,
    },
    bodyWrapper: {
      marginHorizontal: 20,
      marginBottom: 'auto',
    },
    updateButton: {
      marginHorizontal: 20,
    },
    addressIdenticon: {
      alignItems: 'center',
      marginVertical: 10,
    },
    actionIcon: {
      color: colors.primary.default,
    },
    errorContinue: {
      marginVertical: 16,
    },
  });

export default createStyles;
