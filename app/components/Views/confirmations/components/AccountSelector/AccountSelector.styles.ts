import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    /** Full-screen wrapper for transparent Modal so BottomSheet can fill the window. */
    modalRoot: {
      flex: 1,
    },
    /** Lets the account list consume remaining height under BottomSheetHeader inside BottomSheet. */
    modalSheetBody: {
      flex: 1,
      minHeight: 0,
    },
  });

export default stylesheet;
