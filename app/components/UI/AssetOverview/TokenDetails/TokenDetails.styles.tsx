import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    tokenDetailsContainer: {
      marginTop: 16,
      gap: 24,
    },
    title: {
      paddingVertical: 8,
    } as TextStyle,
    listWrapper: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    listItemStacked: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    firstChild: {
      paddingTop: 0,
    },
    lastChild: {
      paddingBottom: 0,
    },
  });

export default styleSheet;
