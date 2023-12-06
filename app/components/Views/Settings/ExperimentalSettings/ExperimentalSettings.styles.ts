import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    buttonWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 20,
    },
    blockaidWrapper: {
      marginHorizontal: 20,
    },
    closeIcon: {
      marginLeft: 'auto',
    },
    iconWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
    },
    iconStyle: {
      alignSelf: 'center',
      marginTop: 20,
    },
    buttonSize: {
      width: 150,
    },
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    title: {
      ...(fontStyles.normal as any),
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    boldTitle: {
      ...(fontStyles.bold as any),
      marginTop: 18,
      marginBottom: 18,
    },
    heading: {
      ...fontStyles.normal,
      marginTop: 18,
    },
    desc: {
      lineHeight: 20,
      marginTop: 12,
    },
    setting: {
      marginVertical: 16,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    switch: {
      alignSelf: 'flex-end',
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text.default,
    },
  });

export default createStyles;
