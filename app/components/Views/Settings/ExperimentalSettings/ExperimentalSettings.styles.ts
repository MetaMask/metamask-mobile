import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    heading: {
      marginTop: 0,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    lineDivider: {
      backgroundColor: colors.border.muted,
      height: 1,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
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
