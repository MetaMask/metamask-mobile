import { createTransactionDetailStyles } from '../../utils/transactionDetailStyles';
import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const baseStyles = createTransactionDetailStyles(theme);

  // Override content padding for funding view
  return {
    ...baseStyles,
    content: {
      ...baseStyles.content,
      paddingTop: 8, // Different padding for funding view
    },
    detailLabel: {
      ...baseStyles.detailLabel,
      fontSize: 16, // Larger font for funding view
    },
    detailValue: {
      ...baseStyles.detailValue,
      fontSize: 16, // Larger font for funding view
    },
  };
};
