import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = params;
  return StyleSheet.create({
    activitiesButton: {
      width: '100%',
      flexDirection: 'row',
      paddingTop: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    buttonContainer: {
      flex: 1,
    },
  });
};

export default styleSheet;
