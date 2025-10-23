import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    recipientFieldSection: {
      flex: 1,
      minWidth: 'auto',
      width: 'auto',
    },
    recipientValueSection: {
      flex: 1,
    },
    recipientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 4,
    },
    accountNameText: {
      flexShrink: 0,
      minWidth: 0,
    },
  });

export default createStyles;
