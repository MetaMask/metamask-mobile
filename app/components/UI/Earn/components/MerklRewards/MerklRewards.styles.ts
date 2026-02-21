import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    claimButtonContainer: {
      paddingHorizontal: 16,
      marginBottom: 16,
    } as ViewStyle,
  });

export default styleSheet;
