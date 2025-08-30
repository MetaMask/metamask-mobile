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
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    cardContainer: {
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 8,
    },
    description: {
      flexWrap: 'wrap',
    },
    networkList: {
      marginBottom: 8,
    },
  });
};

export default styleSheet;
