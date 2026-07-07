import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    // The DSRN BannerAlert ships a 4px left accent bar, a small radius and an
    // 8px left padding. The design uses a flat, fully-rounded banner with 16px
    // horizontal / 12px vertical padding, so those are overridden here. Per-edge
    // padding keys are used so they win over DSRN's `padding`/`paddingLeft`.
    balanceUnavailableBanner: {
      borderLeftWidth: 0,
      borderRadius: 12,
      paddingTop: 12,
      paddingRight: 16,
      paddingBottom: 12,
      paddingLeft: 16,
    },
  });

export default styleSheet;
