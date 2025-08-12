import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useAutomaticTransactionPayToken } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { BigNumber } from 'bignumber.js';

export function usePerpsDepositData({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { amountUnformatted } = useTokenAmount();
  const amountValue = new BigNumber(amountUnformatted ?? '0');

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const isFullView =
    !isKeyboardVisible &&
    !amountValue.isZero() &&
    (isQuotesLoading || Boolean(quotes?.length));

  useAutomaticTransactionPayToken({
    balanceOverrides: [
      {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
        balance: 10,
        chainId: CHAIN_IDS.ARBITRUM,
      },
    ],
  });

  return {
    isFullView,
  };
}
