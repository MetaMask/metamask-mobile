import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useParams } from '../../../../../util/navigation/navUtils';
import { CustomSlippageModalContent } from './CustomSlippageModal';
import { SwapSlippageModalParams } from './types';

export const SwapCustomSlippageModal = () => {
  const dispatch = useDispatch();
  const currentSlippage = useSelector(selectSlippage);
  const { sourceChainId, destChainId } = useParams<SwapSlippageModalParams>();

  const handleConfirmSlippage = useCallback(
    (nextSlippage: string) => {
      dispatch(setSlippage(nextSlippage));
    },
    [dispatch],
  );

  return (
    <CustomSlippageModalContent
      initialSlippage={currentSlippage}
      sourceChainId={sourceChainId}
      destChainId={destChainId}
      onConfirmSlippage={handleConfirmSlippage}
    />
  );
};
