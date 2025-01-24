import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    switchElement: {
      marginLeft: 16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    halfSetting: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
    setting: {
      marginTop: 32,
    },
  });

export default createStyles;
