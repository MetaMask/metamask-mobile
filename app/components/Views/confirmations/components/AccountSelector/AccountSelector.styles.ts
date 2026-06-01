import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    /** Full-screen wrapper for transparent Modal so BottomSheet can fill the window. */
    modalRoot: {
      flex: 1,
    },
    /** Lets the account list consume remaining height under HeaderCompactStandard inside BottomSheet. */
    modalSheetBody: {
      flex: 1,
      minHeight: 0,
    },
    accountText: {
      flexShrink: 1,
    },
  });
};

export default stylesheet;
