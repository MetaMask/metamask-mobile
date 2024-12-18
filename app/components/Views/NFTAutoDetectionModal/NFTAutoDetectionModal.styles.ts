import { StyleSheet } from 'react-native';

/**
 * Style sheet function for NFT auto detection modal component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    image: {
      width: 219,
      height: 219,
    },
    description: {
      marginLeft: 32,
      marginRight: 32,
    },
    buttonsContainer: {
      paddingTop: 24,
      marginLeft: 16,
      marginRight: 16,
    },
    spacer: { height: 8 },
  });

export default styleSheet;
