import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const EXTRA_ANDROID_BOTTOM_PADDING = 64;

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    inputContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },

    extraBottomPadding: {
      paddingBottom:
        Platform.OS === 'android' ? EXTRA_ANDROID_BOTTOM_PADDING : 0,
    },

    disabledButton: {
      opacity: 0.5,
    },

    footerText: {
      alignSelf: 'center',
    },
  });

export default styleSheet;
