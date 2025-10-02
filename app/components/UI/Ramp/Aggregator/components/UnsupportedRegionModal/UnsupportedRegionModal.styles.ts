import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      padding: 24,
    },
    regionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    regionName: {
      marginLeft: 8,
    },
    supportLink: {
      color: theme.colors.primary.default,
      textDecorationLine: 'underline',
    },
    footer: {
      padding: 24,
      paddingTop: 0,
    },
  });
};

export default createStyles;
