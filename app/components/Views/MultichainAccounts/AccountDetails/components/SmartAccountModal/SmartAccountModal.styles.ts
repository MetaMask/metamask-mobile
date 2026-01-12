import { StyleSheet, Platform, StatusBar } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    safeArea: {
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      margin: 16,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      flex: 1,
    },
    cardContainer: {
      borderRadius: 8,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 8,
      backgroundColor: colors.background.section,
    },
    description: {
      flexWrap: 'wrap',
    },
  });
};

export default styleSheet;
