import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.alternative,
      justifyContent: 'flex-end',
    },
    foxContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    foxLogo: {
      width: 120,
      height: 120,
    },
    sheetContent: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 40,
      alignItems: 'center',
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: colors.border.muted,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    warningIcon: {
      marginBottom: 16,
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      textAlign: 'left',
      marginBottom: 24,
      width: '100%',
    },
    button: {
      width: '100%',
    },
  });
};

export default styleSheet;
