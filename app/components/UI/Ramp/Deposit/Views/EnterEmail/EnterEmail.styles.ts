import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    contentContainer: {
      marginTop: 24,
      gap: 16,
    },
    title: {
      fontWeight: 'bold',
    },
    description: {
      color: theme.colors.text.alternative,
    },
    error: {
      color: theme.colors.error.default,
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
