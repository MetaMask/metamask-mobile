import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';

/**
 * Shared styles for control bar components
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const createControlBarStyles = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    actionBarWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 8,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    controlButtonInnerWrapper: {
      flexDirection: 'row',
      gap: 12,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      marginRight: 4,
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
      opacity: 0.5,
    },
    controlButtonText: {
      color: colors.text.default,
    },
    controlIconButton: {
      backgroundColor: colors.background.default,
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });
};

export default createControlBarStyles;
