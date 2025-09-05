import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    button: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      padding: 8,
      marginRight: 16,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: theme.colors.primary.default,
      fontWeight: '500',
    },
  });

export default createStyles;
