import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    heading: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    setting: {
      marginVertical: 0,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
    },
    marginedSwitchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
    },
    switch: {
      alignSelf: 'flex-end',
    },
  });

export default createStyles;
