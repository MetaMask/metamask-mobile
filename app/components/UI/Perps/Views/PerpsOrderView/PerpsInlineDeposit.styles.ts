import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

interface Styles {
  container: ViewStyle;
  inputContainer: ViewStyle;
  disabledButton: ViewStyle;
}

const styleSheet = (_params: {
  theme: Theme;
  vars: Record<string, never>;
}): Styles =>
  StyleSheet.create<Styles>({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    inputContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },

    disabledButton: {
      opacity: 0.5,
    },
  });

export default styleSheet;
