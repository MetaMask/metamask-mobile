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
  });

export default styleSheet;
