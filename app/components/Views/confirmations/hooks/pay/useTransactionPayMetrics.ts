import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTransactionBridgeQuotesById,
  updateConfirmationMetric,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useDeepMemo } from '../useDeepMemo';
import { Json } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { RootState } from '../../../../../reducers';
import { useTransactionPayToken } from './useTransactionPayToken';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { BigNumber } from 'bignumber.js';
import { useTokenAmount } from '../useTokenAmount';

export function useTransactionPayMetrics() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();
  const { amountPrecise } = useTokenAmount();
  const automaticPayToken = useRef<BridgeToken>();

  const transactionId = transactionMeta?.id ?? '';
  const { type } = transactionMeta ?? {};

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  if (!automaticPayToken.current && payToken) {
    automaticPayToken.current = payToken;
  }

  const properties: Json = {};
  const sensitiveProperties: Json = {};

  if (payToken) {
    properties.mm_pay = true;
    properties.mm_pay_token_selected = payToken.symbol;
    properties.mm_pay_chain_selected = payToken.chainId;
    properties.mm_pay_transaction_step_total = (quotes?.length ?? 0) + 1;

    properties.mm_pay_transaction_step =
      properties.mm_pay_transaction_step_total;

    properties.mm_pay_token_presented =
      automaticPayToken.current?.symbol ?? null;

    properties.mm_pay_chain_presented =
      automaticPayToken.current?.chainId ?? null;
  }

  if (payToken && type === TransactionType.perpsDeposit) {
    properties.mm_pay_use_case = 'perps_deposit';
    properties.simulation_sending_assets_total_value = amountPrecise ?? null;
  }

  const nonGasQuote = quotes?.find(
    (q) => q.request?.targetTokenAddress !== NATIVE_TOKEN_ADDRESS,
  );

  if (nonGasQuote) {
    properties.mm_pay_dust_usd = new BigNumber(
      nonGasQuote.quote?.minDestTokenAmount,
    )
      .minus(nonGasQuote.request?.targetAmountMinimum)
      .shiftedBy(-6)
      .toString(10);
  }

  const params = useDeepMemo(
    () => ({
      properties,
      sensitiveProperties,
    }),
    [properties, sensitiveProperties],
  );

  useEffect(() => {
    dispatch(updateConfirmationMetric({ id: transactionId, params }));
  }, [dispatch, transactionId, params]);
}
