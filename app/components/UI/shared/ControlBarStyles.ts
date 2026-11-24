import { StyleSheet } from 'react-native';

/**
 * Shared styles for control bar components
 * @returns StyleSheet object.
 */
const createControlBarStyles = () =>
  StyleSheet.create({
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

export default createControlBarStyles;
