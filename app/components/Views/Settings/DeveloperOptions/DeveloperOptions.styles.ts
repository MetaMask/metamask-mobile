import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
      marginBottom: 32,
    },
    heading: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
