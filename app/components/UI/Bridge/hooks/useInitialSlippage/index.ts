import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsSolanaSwap,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';

export const useInitialSlippage = () => {
  const dispatch = useDispatch();
  const isSolanaSwap = useSelector(selectIsSolanaSwap);

  // Set slippage to undefined for Solana swaps
  useEffect(() => {
    if (isSolanaSwap) {
      dispatch(setSlippage(undefined));
    }
  }, [isSolanaSwap, dispatch]);
};
