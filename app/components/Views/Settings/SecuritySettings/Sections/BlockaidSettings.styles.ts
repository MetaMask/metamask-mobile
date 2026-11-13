import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    desc: {
      marginTop: 8,
    },
    marginedSwitchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
    },
    switch: {
      alignSelf: 'flex-end',
    },
  });

export default createStyles;
