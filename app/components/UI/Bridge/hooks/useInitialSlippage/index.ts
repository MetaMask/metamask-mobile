import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDestToken,
  selectIsBridge,
  selectIsEvmSwap,
  selectIsSolanaSwap,
  selectSourceToken,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import {
  getIsStablecoinPair,
  handleEvmStablecoinSlippage,
} from '../../../Swaps/useStablecoinsDefaultSlippage';
import { isHex } from 'viem';
import usePrevious from '../../../../hooks/usePrevious';
import AppConstants from '../../../../../core/AppConstants';

export const useInitialSlippage = () => {
  const dispatch = useDispatch();
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isBridge = useSelector(selectIsBridge);
  const isEvmSwap = useSelector(selectIsEvmSwap);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  const prevSourceTokenAddress = usePrevious(sourceToken?.address);
  const prevDestTokenAddress = usePrevious(destToken?.address);

  useEffect(() => {
    // Solana Swaps
    if (isSolanaSwap) {
      dispatch(setSlippage('0.5'));
      return;
    }
    // EVM Swaps
    if (
      isEvmSwap &&
      isHex(sourceToken?.chainId) &&
      sourceToken?.address &&
      destToken?.address
    ) {
      if (
        getIsStablecoinPair(
          sourceToken?.address,
          destToken?.address,
          sourceToken?.chainId,
        )
      ) {
        handleEvmStablecoinSlippage({
          sourceTokenAddress: sourceToken?.address,
          destTokenAddress: destToken?.address,
          chainId: sourceToken?.chainId,
          setSlippage: (slippage: number) =>
            dispatch(setSlippage(slippage.toString())),
          prevSourceTokenAddress,
          prevDestTokenAddress,
        });
      } else {
        dispatch(setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString()));
      }
    }

    // Bridge
    if (isBridge) {
      dispatch(setSlippage('0.5'));
      return;
    }
  }, [
    isSolanaSwap,
    isBridge,
    dispatch,
    sourceToken?.address,
    destToken?.address,
    sourceToken?.chainId,
    isEvmSwap,
    prevSourceTokenAddress,
    prevDestTokenAddress,
  ]);
};
