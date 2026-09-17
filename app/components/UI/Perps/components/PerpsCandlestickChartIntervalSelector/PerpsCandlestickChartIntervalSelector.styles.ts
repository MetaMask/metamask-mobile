import { StyleSheet } from 'react-native';

export const selectorStyleSheet = () => {
  return StyleSheet.create({
    intervalSelector: {
      marginTop: 24,
    },
    intervalSelectorContent: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingHorizontal: 8,
    },
  });
};
