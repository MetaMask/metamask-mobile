import React from 'react';
import { ConfirmationContextProvider } from '../../../../confirmations/context/confirmation-context';
import { GasFeeModalTransactionProvider } from '../../../../confirmations/context/gas-fee-modal-transaction';

interface QuickBuyTransactionProviderProps {
  transactionId: string | null | undefined;
  children: React.ReactNode;
}

/**
 * Makes the confirmation Pay hooks resolve against the Quick Buy transaction,
 * even though the bottom sheet is rendered outside the approval-driven
 * confirmation root.
 *
 * `GasFeeModalTransactionProvider` forces `useTransactionMetadataRequest` to
 * look up the transaction by the id we created, bypassing the approval
 * resolution path. `ConfirmationContextProvider` satisfies
 * `useConfirmationContext` calls made by Pay hooks.
 */
export const QuickBuyTransactionProvider: React.FC<
  QuickBuyTransactionProviderProps
> = ({ transactionId, children }) => (
  <GasFeeModalTransactionProvider transactionId={transactionId ?? null}>
    <ConfirmationContextProvider>{children}</ConfirmationContextProvider>
  </GasFeeModalTransactionProvider>
);
