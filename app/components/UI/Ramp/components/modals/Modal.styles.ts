import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import Device from '../../../../../util/device';
import { Colors } from '../../../../../util/theme/models';

const createModalStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalView: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      flex: 0.75,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 24,
      marginTop: 10,
      paddingVertical: Device.isAndroid() ? 0 : 10,
      paddingHorizontal: 5,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    searchIcon: {
      marginHorizontal: 8,
      color: colors.icon.alternative,
    },
    input: {
      ...fontStyles.normal,
      color: colors.text.default,
      flex: 1,
    },
    headerDescription: {
      paddingHorizontal: 24,
    },
    resultsView: {
      marginTop: 0,
      flex: 1,
    },
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 30,
    },
    listItem: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    separator: {
      height: 1,
      width: '100%',
      backgroundColor: colors.border.muted,
    },
  });

export default createModalStyles;
