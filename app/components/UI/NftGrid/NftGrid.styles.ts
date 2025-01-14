import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    itemWrapper: {
      paddingHorizontal: 15,
      paddingBottom: 16,
    },
    collectibleIcon: {
      width: '100%',
      aspectRatio: 1,
    },
    collectibleCard: {
      width: '30%',
      padding: 3,
      marginBottom: 10,
    },
    contentContainerStyles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between', // Optional: Adjust spacing between items
    },
  });

export default styleSheet;
