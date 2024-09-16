import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
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
  });

export default createStyles;
