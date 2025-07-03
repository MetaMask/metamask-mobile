import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../../../styles/common';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    primaryValue: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    secondaryValue: {
      color: theme.colors.text.alternative,
      ...fontStyles.normal,
<<<<<<< HEAD:app/components/Views/confirmations/components/rows/transactions/gas-fee-details-row/gas-fee-details-row.styles.ts
      marginRight: 4,
=======
      marginRight: 8,
>>>>>>> stable:app/components/Views/confirmations/components/rows/transactions/gas-fee-details/gas-fee-details.styles.ts
    },
    valueContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      // Intentional padding to increase touchable area
      padding: 6,
      paddingRight: 0,
    },
    editIcon: {
      marginRight: 4,
    },
    estimationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
