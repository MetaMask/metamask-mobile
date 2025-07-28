import { useCallback, useEffect, useState } from 'react';
import {
  getNetworkNonce,
  updateTransaction,
} from '../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';

const DEFAULT_PLACEHOLDER_NONCE_VALUE = 0;

export const useEditNonce = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const [showNonceModal, setShowNonceModal] = useState(false);
  const [proposedNonce, setProposedNonce] = useState<number>(
    DEFAULT_PLACEHOLDER_NONCE_VALUE,
  );
  const [userSelectedNonce, setUserSelectedNonce] = useState<number>(
    DEFAULT_PLACEHOLDER_NONCE_VALUE,
  );

  useEffect(() => {
    const getTransactionControllerNonce = async () => {
      if (!transactionMetadata) {
        return;
      }

      const transactionControllerNonce = await getNetworkNonce(
        { from: transactionMetadata?.txParams.from },
        transactionMetadata.networkClientId,
      );

      // This value is the initially proposed nonce value. It should not be
      // updated again, even if the transaction metadata nonce is updated by the
      // user.
      if (proposedNonce === DEFAULT_PLACEHOLDER_NONCE_VALUE) {
        setProposedNonce(transactionControllerNonce);
        setUserSelectedNonce(transactionControllerNonce);
      }
    };
    getTransactionControllerNonce();
  }, [transactionMetadata, proposedNonce]);

  const updateNonce = useCallback(
    async (newNonce: number) => {
      setUserSelectedNonce(newNonce);

      if (!transactionMetadata) {
        return;
      }

      const updatedTx = {
        ...transactionMetadata,
        customNonceValue: String(newNonce),
      };

      // TODO: We should not update the whole transaction, instead need to create a new atomic updater method for `customNonceValue`
      // in the transaction controller and use that instead of updateTransaction.
      // Related issue: https://github.com/MetaMask/MetaMask-planning/issues/5076
      await updateTransaction(updatedTx, transactionMetadata.id);
    },
    [transactionMetadata],
  );

  return {
    setShowNonceModal,
    updateNonce,
    showNonceModal,
    proposedNonce,
    userSelectedNonce,
  };
};
