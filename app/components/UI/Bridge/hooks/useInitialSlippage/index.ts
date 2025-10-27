import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceToken,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { getDefaultSlippagePercentage } from '@metamask/bridge-controller';

export const useInitialSlippage = () => {
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  useEffect(() => {
    dispatch(
      setSlippage(
        getDefaultSlippagePercentage({
          stablecoins: [],
          srcAssetId: sourceToken?.assetId,
          destAssetId: destToken?.assetId,
        })?.toString(),
      ),
    );
  }, [dispatch, sourceToken?.assetId, destToken?.assetId]);
};
