import {
  setDestToken,
  selectBridgeViewMode,
  selectDestToken,
  selectBip44DefaultPair,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import {
  getDefaultDestToken,
  getNativeSourceToken,
} from '../../utils/tokenUtils';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeViewMode, BridgeToken } from '../../types';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import usePrevious from '../../../../hooks/usePrevious';
import { useEffect } from 'react';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (
  initialSourceToken?: BridgeToken,
  initialDestToken?: BridgeToken,
) => {
  const dispatch = useDispatch();
  const selectedChainId = useSelector(selectChainId);
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const destToken = useSelector(selectDestToken);
  const bip44DefaultPair = useSelector(selectBip44DefaultPair);

  const isSwap =
    bridgeViewMode === BridgeViewMode.Swap ||
    bridgeViewMode === BridgeViewMode.Unified;

  const prevInitialDestToken = usePrevious(initialDestToken);

  useEffect(() => {
    // If dest token is already set in Redux (pre-populated before navigation), skip initialization
    if (destToken && !initialDestToken) {
      return;
    }

    if (initialDestToken && prevInitialDestToken !== initialDestToken) {
      dispatch(setDestToken(initialDestToken));
      return;
    }

    // Entering Swaps NOT from asset details page or deeplink
    if (!initialDestToken && !initialSourceToken) {
      if (isSwap && bip44DefaultPair && !destToken) {
        dispatch(setDestToken(bip44DefaultPair.destAsset));
        return;
      }
    }

    // Use BIP44 default pair for Bitcoin source token (i.e. entered Swaps from Bitcoin Asset Details page)
    if (initialSourceToken && initialSourceToken.chainId === BtcScope.Mainnet) {
      if (bip44DefaultPair && !destToken) {
        dispatch(setDestToken(bip44DefaultPair.destAsset));
        return;
      }
    }

    const destTokenTargetChainId =
      initialSourceToken?.chainId ?? selectedChainId;
    let defaultDestToken = getDefaultDestToken(destTokenTargetChainId);

    // If the initial source token is the same as the default dest token, set the default dest token to the native token
    if (
      destTokenTargetChainId === SolScope.Mainnet &&
      initialSourceToken?.address === defaultDestToken?.address
    ) {
      // Solana addresses are case sensitive
      defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
    } else if (
      destTokenTargetChainId !== SolScope.Mainnet &&
      initialSourceToken?.address?.toLowerCase() ===
        defaultDestToken?.address?.toLowerCase()
    ) {
      // EVM addresses are NOT case sensitive
      defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
    }

    if (
      isSwap &&
      !destToken &&
      defaultDestToken &&
      initialSourceToken?.address !== defaultDestToken.address
    ) {
      dispatch(setDestToken(defaultDestToken));
    }
  }, [
    initialDestToken,
    prevInitialDestToken,
    dispatch,
    initialSourceToken,
    selectedChainId,
    destToken,
    isSwap,
    initialSourceToken?.address,
    bip44DefaultPair,
  ]);
};
