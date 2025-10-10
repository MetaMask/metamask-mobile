import { Platform, StatusBar, StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: 56, // Ensure consistent header height
    },
    footer: {
      backgroundColor: colors.background.default,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    headerAccessoryWrapper: {
      width: 40,
    },
    startAccessoryWrapper: {
      width: 40,
      alignItems: 'flex-start',
    },
    endAccessoryWrapper: {
      width: 40,
      alignItems: 'flex-end',
    },
  });
};

export default styleSheet;
