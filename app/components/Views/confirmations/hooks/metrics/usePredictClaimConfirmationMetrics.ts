import { useDispatch, useSelector } from 'react-redux';
import {
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictWonPositions,
} from '../../../../UI/Predict/selectors/predictController';
import { useEffect, useMemo } from 'react';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export function usePredictClaimConfirmationMetrics() {
  const dispatch = useDispatch();
  const txMeta = useTransactionMetadataRequest();
  const transactionId = txMeta?.id ?? '';
  const fromAddress = txMeta?.txParams?.from ?? '0x0';

  const winPositions = useSelector(
    selectPredictWonPositions({
      address: fromAddress,
    }),
  );

  const predict_claim_value_usd = useSelector(
    selectPredictWinFiat({ address: fromAddress }),
  );
  const predict_pnl = useSelector(
    selectPredictWinPnl({ address: fromAddress }),
  );

  const predict_market_title = useMemo(
    () => winPositions.map((p) => p.title),
    [winPositions],
  );

  useEffect(() => {
    dispatch(
      updateConfirmationMetric({
        id: transactionId,
        params: {
          properties: {
            predict_claim_value_usd,
            predict_market_title,
            predict_pnl,
          },
          sensitiveProperties: {},
        },
      }),
    );
  }, [
    dispatch,
    predict_claim_value_usd,
    predict_market_title,
    predict_pnl,
    transactionId,
  ]);
}
