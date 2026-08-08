import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

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
      alignItems: 'center',
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
      alignItems: 'center',
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    networkAvatarWrapper: {
      marginRight: 4,
    },
  });
};

export default createControlBarStyles;
