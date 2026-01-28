/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    contentContainer: {
      flex: 1,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    buttonWrapper: {
      marginTop: 24,
    },
    keyboardStickyView: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    fixedBottomContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.background.default,
    },
  });

export { createStyles };
