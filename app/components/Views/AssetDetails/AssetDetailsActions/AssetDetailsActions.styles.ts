import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    activitiesButton: {
      width: '100%',
      flexDirection: 'row',
      paddingVertical: 20,
      paddingHorizontal: 16,
      gap: 8,
    },
    buttonContainer: {
      flex: 1,
    },
  });

export default styleSheet;
