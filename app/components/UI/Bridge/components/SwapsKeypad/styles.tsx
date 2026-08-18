import { StyleSheet } from 'react-native';

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
