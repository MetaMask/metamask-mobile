import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) =>
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
