import { useSelector } from 'react-redux';
import {
  TransactionEnvelopeType,
  TransactionMeta,
} from '@metamask/transaction-controller';

import { selectIsEIP1559Network } from '../../../../selectors/networkController';

export function useSupportsEIP1559(transactionMeta: TransactionMeta) {
  const isLegacyTxn =
    transactionMeta?.txParams?.type === TransactionEnvelopeType.legacy;
  const networkSupportsEIP1559 = useSelector(selectIsEIP1559Network);

  const supportsEIP1559 = networkSupportsEIP1559 && !isLegacyTxn;

  return { supportsEIP1559 };
}
