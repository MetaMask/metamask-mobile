import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme }: { theme: Theme }) => {
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
    },
  });
};

export default styleSheet;
