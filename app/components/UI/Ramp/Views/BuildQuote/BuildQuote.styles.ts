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
    actionSection: {
      paddingBottom: 16,
    },
    // The quick-amount row and the Continue button are the same height. The
    // attribution sits above Continue without joining that height, so the
    // centered amount does not jump when an amount is entered.
    continueStack: {
      width: '100%',
      gap: 16,
    },
    continueMessage: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: '100%',
      paddingBottom: 16,
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
