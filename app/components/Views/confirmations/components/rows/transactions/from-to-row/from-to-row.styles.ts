import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 2,
      paddingBottom: 5,
      paddingHorizontal: 4,
    },
    nameContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
    },
    leftNameContainer: {
      justifyContent: 'flex-start',
    },
    rightNameContainer: {
      justifyContent: 'flex-end',
    },
    iconContainer: {
      paddingHorizontal: 8,
    },
    skeletonBorderRadiusLarge: {
      borderRadius: 18,
    },
    skeletonBorderRadiusSmall: {
      borderRadius: 4,
    },
  });

export default styleSheet;
