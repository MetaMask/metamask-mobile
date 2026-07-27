import { StyleSheet } from 'react-native';

const styleSheet = () =>
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
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
  });

export default styleSheet;
