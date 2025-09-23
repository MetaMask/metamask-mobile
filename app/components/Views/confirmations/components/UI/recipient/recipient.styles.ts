import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    recipientAddress: {
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
