import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createSwapsKeypadStyles = (theme: Theme) =>
  StyleSheet.create({
    keypadContainer: {
      alignContent: 'flex-end',
      paddingHorizontal: 16,
      gap: 16,
      paddingTop: 16,
    },
    keypadDialog: {
      marginHorizontal: -1,
      marginBottom: -1,
      borderBottomColor: theme.colors.background.default,
    },
  });
export const quickPickButtonsStyles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
  },
});
