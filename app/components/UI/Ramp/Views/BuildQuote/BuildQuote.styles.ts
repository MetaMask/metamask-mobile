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
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cursor: {
      width: 2,
      marginHorizontal: 1,
      alignSelf: 'center',
      backgroundColor: theme.colors.primary.default,
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
