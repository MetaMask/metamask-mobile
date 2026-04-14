import React, { useCallback, useState } from 'react';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import AccountSelector from '../AccountSelector';

export interface PayAccountSelectorProps {
  label?: string;
  isPostQuote?: boolean;
  onAccountSelected?: (address: string) => void;
}
const PayAccountSelector: React.FC<PayAccountSelectorProps> = ({
  label,
  isPostQuote,
  onAccountSelected,
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;

  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    undefined,
  );

  const handleAccountSelected = useCallback(
    (address: string) => {
      if (transactionId) {
        Engine.context.TransactionPayController.setTransactionConfig(
          transactionId,
          (config) => {
            config.accountOverride = address as Hex;
            if (isPostQuote) {
              config.isPostQuote = true;
            }
          },
        );
      }
      setSelectedAddress(address);
      onAccountSelected?.(address);
    },
    [transactionId, isPostQuote, onAccountSelected],
  );

  return (
    <AccountSelector
      label={label}
      selectedAddress={selectedAddress}
      onAccountSelected={handleAccountSelected}
    />
  );
};

export default PayAccountSelector;
