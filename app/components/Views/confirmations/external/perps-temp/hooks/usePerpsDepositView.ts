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
import { usePerpsDepositInit } from './usePerpsDepositInit';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayTokenAmounts } from '../../../hooks/pay/useTransactionPayTokenAmounts';
import {
  ARBITRUM_USDC_ADDRESS,
  PERPS_MINIMUM_DEPOSIT,
} from '../../../constants/perps';

export function usePerpsDepositView({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  usePerpsDepositInit();

  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { amountUnformatted } = useTokenAmount();
  const { payToken } = useTransactionPayToken();
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();

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
    (isQuotesLoading || Boolean(quotes?.length) || sourceAmounts?.length === 0);

  useAutomaticTransactionPayToken({
    balanceOverrides: [
      {
        address: ARBITRUM_USDC_ADDRESS,
        balance: PERPS_MINIMUM_DEPOSIT,
        chainId: CHAIN_IDS.ARBITRUM,
      },
    ],
  });

  return {
    isFullView,
    isPayTokenSelected: Boolean(payToken),
  };
}
