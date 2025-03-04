import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const upsellBannerStylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      gap: 8,
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
  });
};

export default upsellBannerStylesheet;
