import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { baseStyles } from '../../../styles/common';
export const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styleSheet;
