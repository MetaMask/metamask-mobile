import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    actionsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
    },
    cancelButton: { flex: 1 },
    confirmButton: { flex: 1 },
  });

export default createStyles;
