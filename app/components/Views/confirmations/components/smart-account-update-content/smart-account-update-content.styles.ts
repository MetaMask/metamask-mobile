import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    image: {
      marginTop: 28,
      height: '28%',
      width: '100%',
    },
    title: {
      marginLeft: 8,
    },
    requestSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      height: 24,
      width: 24,
    },
    listWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingInline: 2,
    },
    textSection: {
      marginLeft: 8,
      width: '90%',
    },
    accountIcon: {
      marginRight: -6,
    },
  });

export default styleSheet;
