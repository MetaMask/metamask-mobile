import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { memoizedGetTokenStandardAndDetails } from '../../utils/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';

const TRANSFER_TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
];

export function useTokenContractAlert(): Alert[] {
  const transactionMetadata =
    useTransactionMetadataRequest() as TransactionMeta;
  const recipient = useTransferRecipient();
  const chainId = transactionMetadata?.chainId;
  const transactionType = transactionMetadata?.type;

  const isTransfer =
    transactionType !== undefined &&
    TRANSFER_TRANSACTION_TYPES.includes(transactionType as TransactionType);

  const { value: isTokenContract } = useAsyncResult(async () => {
    if (!isTransfer || !recipient || !chainId) {
      return false;
    }

    try {
      const { NetworkController } = Engine.context;
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        chainId as Hex,
      );

      const token = await memoizedGetTokenStandardAndDetails({
        tokenAddress: recipient,
        networkClientId,
      });

      return Boolean(token?.standard);
    } catch {
      return false;
    }
  }, [isTransfer, recipient, chainId]);

  return useMemo(() => {
    if (!isTokenContract) {
      return [];
    }

    return [
      {
        key: AlertKeys.TokenContractAddress,
        field: RowAlertKey.InteractingWith,
        message: strings('alert_system.token_contract_warning.message'),
        title: strings('alert_system.token_contract_warning.title'),
        severity: Severity.Warning,
        isBlocking: false,
      },
    ];
  }, [isTokenContract]);
}
