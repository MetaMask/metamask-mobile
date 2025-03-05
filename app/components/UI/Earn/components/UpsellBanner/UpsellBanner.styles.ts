import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { UPSELL_BANNER_VARIANTS } from './UpsellBanner.types';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
    },
    [UPSELL_BANNER_VARIANTS.DEFAULT]: {
      marginVertical: 8,
    },
    [UPSELL_BANNER_VARIANTS.HEADER]: {
      marginBottom: 16,
    },
    [UPSELL_BANNER_VARIANTS.FOOTER]: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
