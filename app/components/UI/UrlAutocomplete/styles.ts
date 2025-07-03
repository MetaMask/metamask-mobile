import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
      // Hidden by default
      display: 'none',
      paddingTop: 8,
    },
    keyboardAvoidingView: {
      flex: 1
    },
    contentContainer: {
      paddingVertical: 15,
    },
    bg: {
      flex: 1,
    },
    centeredLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    }
  });

export default styleSheet;
