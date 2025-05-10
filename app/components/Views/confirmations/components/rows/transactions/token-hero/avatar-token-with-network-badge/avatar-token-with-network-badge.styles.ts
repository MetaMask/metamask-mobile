import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../../util/theme/models';

export const styleSheet = (params: {
  theme: Theme;
}) => {
  const { theme } = params;
  return StyleSheet.create({
    avatarNetwork: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 99,
    },
  });
};
