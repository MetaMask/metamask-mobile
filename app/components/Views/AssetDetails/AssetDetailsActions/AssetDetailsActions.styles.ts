import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    activitiesButton: {
      width: '100%',
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8, // Gap between Main Action Buttons: 8px (unchanged)
    },
    buttonContainer: {
      flex: 1,
      overflow: 'hidden',
    },
  });

export default styleSheet;
