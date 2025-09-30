import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    paymentMethodRow: {
      marginVertical: 8,
    },
    disclaimerContainer: {
      marginTop: 16,
      paddingHorizontal: 8,
    },
    disclaimer: {
      textAlign: 'center',
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
