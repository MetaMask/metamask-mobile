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
    footer: {
      //   flex: 1,
      alignItems: 'center',
      //   marginTop: 8,
    },
    spinner: {
      marginBottom: 8,
    },
    emptyContainer: {
      // flex: 1,
      alignItems: 'center',
      outline: 'solid red 2px',
    },
    emptyImageContainer: {
      width: 76,
      height: 76,
      // marginTop: 30,
      // marginBottom: 12,
      // tintColor: colors.icon.muted,
    },
    emptyTitleText: {
      fontSize: 24,
      // color: colors.text.alternative,
    },
    emptyText: {
      // color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
  });

export default styleSheet;
