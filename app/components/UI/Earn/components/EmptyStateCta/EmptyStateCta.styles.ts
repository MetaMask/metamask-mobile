import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
    },
    heading: {
      paddingBottom: 8,
    },
    body: {
      textAlign: 'center',
      paddingBottom: 16,
    },
  });
};

export default styleSheet;
