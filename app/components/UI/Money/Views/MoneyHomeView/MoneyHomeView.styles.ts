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
    protectMoneyRiveBanner: {
      height: 168,
      overflow: 'hidden',
      borderRadius: 16,
      backgroundColor: params.theme.colors.background.section,
    },
    protectMoneyRiveCopy: {
      zIndex: 1,
      width: '62%',
      height: '100%',
      padding: 16,
    },
    protectMoneyRiveTitle: {
      width: 240,
      color: params.theme.colors.text.default,
    },
    protectMoneyRiveDescription: {
      width: 220,
      marginTop: 8,
      color: params.theme.colors.text.alternative,
    },
    protectMoneyRiveButton: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      minHeight: 40,
      marginTop: 14,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: params.theme.colors.icon.default,
    },
    protectMoneyRiveButtonLabel: {
      color: params.theme.colors.icon.inverse,
    },
    protectMoneyRiveArtwork: {
      position: 'absolute',
      top: 36,
      right: 14,
      width: '34%',
      height: 112,
    },
  });

export default styleSheet;
