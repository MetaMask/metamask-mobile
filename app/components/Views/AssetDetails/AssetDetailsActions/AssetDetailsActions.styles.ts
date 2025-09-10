import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    activitiesButton: {
      width: '100%',
      flexDirection: 'row',
      paddingTop: 24, // Balance to Main Action Buttons: 24px
      paddingBottom: 0, // Remove bottom padding, will be handled by carousel spacing
      paddingHorizontal: 16,
      gap: 8, // Gap between Main Action Buttons: 8px (unchanged)
    },
    buttonContainer: {
      flex: 1,
    },
  });

export default styleSheet;
