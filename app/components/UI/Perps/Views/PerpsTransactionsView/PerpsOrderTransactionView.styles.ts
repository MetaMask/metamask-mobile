import { createTransactionDetailStyles } from '../../utils/transactionDetailStyles';
import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return createTransactionDetailStyles(theme);
};
