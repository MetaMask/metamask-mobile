import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    contentContainer: {
      padding: 24,
      paddingBottom: 56,
    },
    section: {
      marginTop: 24,
    },
    heading: {
      marginBottom: 8,
    },
    valueBox: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    accessory: {
      marginTop: 12,
    },
    loader: {
      marginTop: 32,
    },
  });
};

export default styleSheet;
