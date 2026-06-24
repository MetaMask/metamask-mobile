import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    headerTitle: {
      textAlign: 'center',
      color: theme.colors.text.default,
    },
    content: {
      padding: 16,
      gap: 16,
    },
  });
};

export default styleSheet;
