import { Theme } from '@metamask/design-tokens';
import { StyleSheet as RNStyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = params;
  return RNStyleSheet.create({
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
};

export default styleSheet;
