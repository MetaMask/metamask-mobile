import { StyleSheet } from 'react-native';

const styleSheet = () => {
  const baseStyles = StyleSheet.create({
    container: {
      gap: 4,
      alignItems: 'center',
    },
  });

  return StyleSheet.create({
    container: {
      ...baseStyles.container,
      paddingVertical: 16,
    },
    containerSkeleton: baseStyles.container,
  });
};

export default styleSheet;
