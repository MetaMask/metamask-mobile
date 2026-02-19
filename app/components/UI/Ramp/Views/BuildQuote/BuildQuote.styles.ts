import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
    },
    centerGroup: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flex: 1,
    },
    mainAmount: {
      textAlign: 'center',
      fontSize: 64,
      lineHeight: 64 + 8,
      fontWeight: '400',
    },
    amountContainer: {
      alignItems: 'center',
      gap: 16,
    },
    actionSection: {
      paddingBottom: 16,
      gap: 16,
    },
    poweredByText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
