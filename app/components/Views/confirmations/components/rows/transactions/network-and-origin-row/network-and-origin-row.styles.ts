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
  });

export default styleSheet;
