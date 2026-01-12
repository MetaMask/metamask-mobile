import { TransactionMeta } from '@metamask/transaction-controller';

export interface MusdConversionTransactionDetailsProps {
  route: {
    params: {
      transactionMeta: TransactionMeta;
    };
  };
}

export const MusdConversionTransactionDetailsSelectorsIDs = {
  CONTAINER: 'musd-conversion-transaction-details-container',
  STATUS_ROW: 'musd-conversion-transaction-details-status-row',
  DATE_ROW: 'musd-conversion-transaction-details-date-row',
  GAS_FEE_ROW: 'musd-conversion-transaction-details-gas-fee-row',
  BLOCK_EXPLORER_BUTTON:
    'musd-conversion-transaction-details-block-explorer-button',
};
