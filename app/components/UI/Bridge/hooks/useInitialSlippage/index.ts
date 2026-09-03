import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsSlippageUserOverride,
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';

export const useInitialSlippage = (
  quoteSlippage: number | string | undefined,
  isCurrentQuote: boolean,
) => {
  const dispatch = useDispatch();
  const slippage = useSelector(selectSlippage);
  const isUserOverride = useSelector(selectIsSlippageUserOverride);

  useEffect(() => {
    if (
      quoteSlippage !== undefined &&
      isCurrentQuote &&
      !isUserOverride &&
      slippage === undefined
    ) {
      dispatch(setSlippage(String(quoteSlippage)));
    }
  }, [dispatch, isCurrentQuote, isUserOverride, quoteSlippage, slippage]);
};
