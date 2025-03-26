import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    overlappingAvatarsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 16,
    },
    avatarWrapper: {
      marginLeft: -15,
    },
  });

export default styleSheet;
