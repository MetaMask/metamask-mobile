import {
  selectSourceToken,
  setSourceAmount,
  setSourceToken,
  selectBip44DefaultPair,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isNonEvmChainId,
  formatChainIdToCaip,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { constants } from 'ethers';
import usePrevious from '../../../../hooks/usePrevious';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../../../selectors/multichainNetworkController';
import { useEffect } from 'react';

export const getNativeSourceToken = (chainId: Hex | CaipChainId) => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  // getNativeAssetForChainId returns zero address for non-EVM chains, we need the CAIP assetId to get balances properly for native asset
  const address = isNonEvmChainId(chainId)
    ? nativeAsset.assetId
    : nativeAsset.address;

  const nativeSourceTokenFormatted: BridgeToken = {
    address,
    name: nativeAsset.name ?? '',
    symbol: nativeAsset.symbol,
    image: 'iconUrl' in nativeAsset ? nativeAsset.iconUrl || '' : '',
    decimals: nativeAsset.decimals,
    chainId,
  };

  return nativeSourceTokenFormatted;
};

/**
 *
 * @param initialSourceToken The initial source token to set, e.g. coming in from Asset Details page or a deeplink
 * @param initialSourceAmount The initial source amount to set, e.g. coming in from a deeplink
 */
export const useInitialSourceToken = (
  initialSourceToken?: BridgeToken,
  initialSourceAmount?: string,
) => {
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const prevInitialSourceToken = usePrevious(initialSourceToken);
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedNonEvmNetworkChainId = useSelector(
    selectSelectedNonEvmNetworkChainId,
  );

  const {
    chainId: selectedEvmChainId,
    domainIsConnectedDapp,
    networkName: selectedEvmNetworkName,
  } = useNetworkInfo();
  const { onSetRpcTarget, onNonEvmNetworkChange } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId: selectedEvmChainId,
    selectedNetworkName: selectedEvmNetworkName,
  });
  const bip44DefaultPair = useSelector(selectBip44DefaultPair);

  const chainId = isEvmNetworkSelected
    ? selectedEvmChainId
    : selectedNonEvmNetworkChainId;

  useEffect(() => {
    // If no initial source token is provided,
    // set the source token to the bip44 default pair (preferred) or the native token of the current chain
    if (!initialSourceToken && !sourceToken) {
      if (bip44DefaultPair) {
        dispatch(setSourceToken(bip44DefaultPair.sourceAsset));
        return;
      }

      dispatch(setSourceToken(getNativeSourceToken(chainId)));
      return;
    }

    if (prevInitialSourceToken === initialSourceToken) return;

    // Fix for the case where the initial source token is the native token of the current chain
    if (initialSourceToken?.address === constants.AddressZero) {
      // Set the source token
      dispatch(
        setSourceToken(getNativeSourceToken(initialSourceToken?.chainId)),
      );
    } else {
      // Set the source token
      dispatch(setSourceToken(initialSourceToken));
    }

    // Set source amount if provided
    if (initialSourceAmount) {
      dispatch(setSourceAmount(initialSourceAmount));
    }

    // Change network if necessary
    if (initialSourceToken?.chainId) {
      // Convert both chain IDs to CAIP format for accurate comparison
      const sourceCaipChainId = formatChainIdToCaip(initialSourceToken.chainId);
      const currentCaipChainId = formatChainIdToCaip(chainId);

      if (sourceCaipChainId !== currentCaipChainId) {
        if (isNonEvmChainId(sourceCaipChainId)) {
          onNonEvmNetworkChange(sourceCaipChainId);
          return;
        }

        const hexChainId = formatChainIdToHex(sourceCaipChainId);
        onSetRpcTarget(evmNetworkConfigurations[hexChainId]);
      }
    }
  }, [
    initialSourceToken,
    sourceToken,
    evmNetworkConfigurations,
    chainId,
    onSetRpcTarget,
    onNonEvmNetworkChange,
    dispatch,
    initialSourceAmount,
    prevInitialSourceToken,
    bip44DefaultPair,
  ]);
};
