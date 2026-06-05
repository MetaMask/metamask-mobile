import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      borderRadius: 100,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    upgradeButton: {
      backgroundColor: '#1B2A49',
    },
    downgradeButton: {
      backgroundColor: '#4A1B1B',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
  });

export default styleSheet;
