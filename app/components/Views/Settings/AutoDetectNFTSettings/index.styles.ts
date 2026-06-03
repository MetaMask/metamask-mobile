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
      marginTop: 24,
    },
    desc: {
      marginTop: 8,
    },
    setting: {
      marginTop: 24,
    },
  });

export default createStyles;
