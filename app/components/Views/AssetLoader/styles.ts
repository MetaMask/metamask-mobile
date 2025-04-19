import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.default,
        alignItems: 'center',
        justifyContent: 'center',
    }
  });

export default styleSheet;
