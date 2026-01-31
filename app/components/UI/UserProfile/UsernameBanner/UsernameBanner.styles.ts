import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.muted,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      alignSelf: 'flex-start',
      gap: 6,
    },
    username: {
      color: colors.primary.default,
    },
  });
};

export default styleSheet;
