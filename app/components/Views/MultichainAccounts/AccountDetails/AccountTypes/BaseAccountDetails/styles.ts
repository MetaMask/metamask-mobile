import { Theme } from '@metamask/design-tokens';
import { Platform, StatusBar, StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    safeArea: {
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      flex: 1, // Ensure SafeAreaView takes full available space
    },

    section: {
      borderRadius: 8,
      overflow: 'hidden',
      gap: 2,
    },

    baseRow: {
      height: 52,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'stretch',
      backgroundColor: colors.background.alternative,
    },

    container: {
      padding: 16,
      flex: 1, // Ensure ScrollView can expand to fill available space
    },

    header: {
      margin: 16,
    },

    text: {
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
