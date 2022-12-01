import {StyleSheet} from 'react-native';
import { fontStyles } from '../../../../styles/common';

const createStyles = (colors: any) =>
  StyleSheet.create({
    uppercase: {
      textTransform: 'capitalize',
    },
    viewData: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginTop: 20,
    },
    viewDataRow: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    viewDataTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
    },
    viewDataText: {
      marginTop: 20,
      color: colors.text.default,
    },
    viewDataArrow: {
      marginLeft: 'auto',
    },
    transactionDetails: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
    },
    transactionDetailsRow: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingVertical: 4,
    },
    transactionDetailsTextLeft: {
      ...fontStyles.thin,
      color: colors.text.default,
      fontSize: 14,
    },
    transactionDetailsTextRight: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
      textAlign: 'right',
      flexDirection: 'row',
      marginLeft: 'auto',
    },
    section: {
      minWidth: '100%',
      width: '100%',
      // height: '100%',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    container: {
        flex: 1,
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
    copyIcon: {
      marginLeft: 1,
      marginTop: 2,
    },
    address: {
      ...fontStyles.bold,
      color: colors.primary.default,
      marginHorizontal: 8,
      maxWidth: 120,
    },
  });

export default createStyles;