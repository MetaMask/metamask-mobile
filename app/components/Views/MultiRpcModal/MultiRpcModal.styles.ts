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
      width: 102.64,
      height: 102.64,
    },
    description: {
      marginLeft: 32,
      marginRight: 32,
    },
    content: {
      height: '80%',
    },
    textDescription: {
      textAlign: 'center',
    },
    textContainer: {
      marginLeft: 16,
      marginRight: 16,
      paddingVertical: 16,
    },
    buttonsContainer: {
      marginLeft: 16,
      marginRight: 16,
      paddingVertical: 16,
    },
    spacer: { height: 8 },
  });

export default styleSheet;
