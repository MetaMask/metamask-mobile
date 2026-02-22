import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    infoRowOverride: {
      paddingBottom: 4,
    },
    networkRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarNetwork: {
      marginRight: 4,
    },
    skeletonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    skeletonBorderRadius: {
      borderRadius: 4,
    },
  });

export default styleSheet;
