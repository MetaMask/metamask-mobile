import type { ViewStyle } from 'react-native';

/**
 * Overrides for DSRN BannerAlert to match the flat, fully-rounded banner used
 * on Money Home and Card Home. Per-edge padding keys win over DSRN defaults.
 */
export const FLAT_BANNER_ALERT_STYLE: ViewStyle = {
  borderLeftWidth: 0,
  borderRadius: 16,
  paddingTop: 12,
  paddingRight: 16,
  paddingBottom: 12,
  paddingLeft: 16,
};
