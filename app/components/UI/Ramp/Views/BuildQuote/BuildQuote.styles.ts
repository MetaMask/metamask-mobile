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
    amountContainer: {
      alignItems: 'center',
      gap: 16,
    },
    amountInput: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      textAlign: 'center',
    },
    actionSection: {
      paddingBottom: 16,
      gap: 16,
    },
    poweredByText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    centeredText: {
      textAlign: 'center' as const,
    },
  });
};

export default styleSheet;
