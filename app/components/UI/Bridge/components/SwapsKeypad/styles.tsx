import { StyleSheet } from 'react-native';

export const swapsKeypadStyles = StyleSheet.create({
  keypadContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  keypad: {
    paddingHorizontal: 24,
  },
});

export const quickPickButtonsStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexDirection: 'row',
  },
  button: {
    flex: 1,
  },
});
