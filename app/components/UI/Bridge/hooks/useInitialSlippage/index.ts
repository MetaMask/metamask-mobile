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
import { isHex } from 'viem';
import AppConstants from '../../../../../core/AppConstants';
import { getIsStablecoinPair } from '../useStablecoinsDefaultSlippage';
import { useRWAToken } from '../useRWAToken';

export const useInitialSlippage = () => {
  const dispatch = useDispatch();
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isBridge = useSelector(selectIsBridge);
  const isEvmSwap = useSelector(selectIsEvmSwap);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const { isStockToken } = useRWAToken();
  const isSourceRwa = isStockToken(sourceToken);
  const isDestRwa = isStockToken(destToken);

  useEffect(() => {
    // Solana Swaps
    if (isSolanaSwap) {
      // We pass undefined to use dynamic slippage from providers
      dispatch(setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE_SOLANA));
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
        dispatch(
          setSlippage(
            AppConstants.SWAPS.DEFAULT_SLIPPAGE_STABLECOINS.toString(),
          ),
        );
        return;
      }

      // if it's a RWA swap, use dynamic slippage
      if (isSourceRwa || isDestRwa) {
        dispatch(setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA));
        return;
      }

      dispatch(setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString()));
      return;
    }

    // Bridge
    if (isBridge) {
      dispatch(
        setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE_BRIDGE.toString()),
      );
      return;
    }
  }, [
    isSolanaSwap,
    isBridge,
    isEvmSwap,
    dispatch,
    sourceToken?.address,
    sourceToken?.chainId,
    destToken?.address,
    isSourceRwa,
    isDestRwa,
  ]);
};
