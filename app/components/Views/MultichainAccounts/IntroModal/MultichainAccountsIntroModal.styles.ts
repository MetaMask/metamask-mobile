import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingTop: 50, // Status bar height + some padding
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      paddingTop: 8,
      position: 'relative',
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    title: {
      textAlign: 'center',
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
    },
    imagePlaceholder: {
      width: '100%',
      height: 250,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      alignSelf: 'center',
      marginBottom: 32,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    sectionDescription: {
      marginBottom: 24,
    },
    buttonsContainer: {
      padding: 24,
      gap: 12,
      marginBottom: 24,
    },
  });
};

export default styleSheet;
