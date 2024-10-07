import { StyleSheet } from 'react-native';

const styleSheet = () => {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: 16,
    },
    contentContainerStyle: {
      paddingBottom: 75,
    },
  });
};

export default styleSheet;
