import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    heading: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
    setting: {
      marginVertical: 16,
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
      marginTop: 32,
    },
    switch: {
      alignSelf: 'flex-end',
    },
  });

export default createStyles;
