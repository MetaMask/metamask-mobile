import { useDispatch, useSelector } from 'react-redux';
import {
  selectPredictClaimFiat,
  selectPredictClaimPnl,
  selectPredictPayablePositions,
} from '../../../../UI/Predict/selectors/predictController';
import { useEffect, useMemo } from 'react';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';

export function usePredictClaimConfirmationMetrics() {
  const dispatch = useDispatch();
  const txMeta = useTransactionMetadataRequest();
  const transactionId = txMeta?.id ?? '';
  const fromAddress = txMeta?.txParams?.from ?? '0x0';

  const payablePositions = useSelector((state: RootState) =>
    selectPredictPayablePositions(state, fromAddress),
  );

  const predict_claim_value_usd = useSelector((state: RootState) =>
    selectPredictClaimFiat(state, fromAddress),
  );
  const predict_pnl = useSelector((state: RootState) =>
    selectPredictClaimPnl(state, fromAddress),
  );

  const predict_market_title = useMemo(
    () => payablePositions.map((p) => p.title),
    [payablePositions],
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
