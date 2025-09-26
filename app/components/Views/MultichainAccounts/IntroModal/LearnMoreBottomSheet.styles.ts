import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 8,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    description: {
      marginBottom: 24,
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingTop: 0,
    },
  });
};

export default styleSheet;
