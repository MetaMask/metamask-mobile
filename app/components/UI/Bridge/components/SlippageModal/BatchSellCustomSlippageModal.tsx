import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectBatchSellSlippages,
  setBatchSellTokenSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useParams } from '../../../../../util/navigation/navUtils';
import { CustomSlippageModalContent } from './CustomSlippageModal';
import { BatchSellSlippageModalParams } from './types';
import { getBatchSellSlippage } from './utils';

export const BatchSellCustomSlippageModal = () => {
  const dispatch = useDispatch();
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const { sourceChainId, destChainId, batchSellAssetId } =
    useParams<BatchSellSlippageModalParams>();
  const initialSlippage = getBatchSellSlippage(
    batchSellSlippages,
    batchSellAssetId,
  );

  const handleConfirmSlippage = useCallback(
    (nextSlippage: string) => {
      dispatch(
        setBatchSellTokenSlippage({
          assetId: batchSellAssetId,
          slippage: nextSlippage,
        }),
      );
    },
    [batchSellAssetId, dispatch],
  );

  return (
    <CustomSlippageModalContent
      initialSlippage={initialSlippage}
      sourceChainId={sourceChainId}
      destChainId={destChainId}
      onConfirmSlippage={handleConfirmSlippage}
    />
  );
};
