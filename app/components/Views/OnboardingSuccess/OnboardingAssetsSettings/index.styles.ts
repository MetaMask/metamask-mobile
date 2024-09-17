import { StyleSheet } from 'react-native';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: 16,
    },
    backButton: {
      padding: 10,
    },
    setting: {
      marginTop: 32,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    desc: {
      marginTop: 8,
    },
    halfSetting: {
      marginTop: 16,
    },
    switchElement: {
      marginLeft: 16,
    },
    accessory: {
      marginTop: 16,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    transactionsContainer: {
      marginTop: 24,
      marginLeft: -16,
      marginRight: -16,
    },
    cellBorder: {
      borderWidth: 0,
    },
    contentContainerStyle: {
      paddingBottom: 75,
    },
  });

export default createStyles;
