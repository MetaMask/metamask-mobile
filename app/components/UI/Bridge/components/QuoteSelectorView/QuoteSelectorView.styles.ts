import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
  });
};
