import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    logo: {
      height: 24,
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
