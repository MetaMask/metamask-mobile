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
import { handleEvmStablecoinSlippage } from '../../../Swaps/useStablecoinsDefaultSlippage';
import { isHex } from 'viem';
import usePrevious from '../../../../hooks/usePrevious';

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
      handleEvmStablecoinSlippage({
        sourceTokenAddress: sourceToken?.address,
        destTokenAddress: destToken?.address,
        chainId: sourceToken?.chainId,
        setSlippage: (slippage: number) =>
          dispatch(setSlippage(slippage.toString())),
        prevSourceTokenAddress,
        prevDestTokenAddress,
      });
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
