import { useRoute, RouteProp } from '@react-navigation/native';
import { setSourceToken } from '../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { BridgeToken, BridgeViewMode } from '../types';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useSwitchNetworks } from '../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../selectors/selectedNetworkController';
import { CaipChainId, Hex } from '@metamask/utils';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { constants } from 'ethers';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF

const getNativeSourceToken = (chainId: Hex | CaipChainId) => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  const nativeSourceTokenFormatted: BridgeToken = {
    address: nativeAsset.address,
    name: nativeAsset.name ?? '',
    symbol: nativeAsset.symbol,
    image: 'iconUrl' in nativeAsset ? nativeAsset.iconUrl : '',
    decimals: nativeAsset.decimals,
    chainId,
  };

  return nativeSourceTokenFormatted;
};

export interface BridgeRouteParams {
  token: BridgeToken;
  sourcePage: string;
  bridgeViewMode: BridgeViewMode;
}

export const useInitialSourceToken = () => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const {
    chainId: selectedChainId,
    domainIsConnectedDapp,
    networkName: selectedNetworkName,
  } = useNetworkInfo();
  const {
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  } = useSwitchNetworks({
    domainIsConnectedDapp,
    selectedChainId,
    selectedNetworkName,
  });

  const initialSourceToken = route.params?.token;

  useEffect(() => {
    // Will default to the native token of the current chain if no token is provided
    if (!initialSourceToken) {
      dispatch(setSourceToken(getNativeSourceToken(selectedChainId)));
      return;
    }

    // Fix for the case where the initial source token is the native token of the current chain
    if (initialSourceToken.address === constants.AddressZero) {
      // Set the source token
      dispatch(
        setSourceToken(getNativeSourceToken(initialSourceToken.chainId)),
      );
    } else {
      // Set the source token
      dispatch(setSourceToken(initialSourceToken));
    }

    // Change network if necessary
    if (initialSourceToken.chainId !== selectedChainId) {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (initialSourceToken.chainId === SolScope.Mainnet) {
        onNonEvmNetworkChange(initialSourceToken.chainId);
        return;
      }
      ///: END:ONLY_INCLUDE_IF

      onSetRpcTarget(
        evmNetworkConfigurations[initialSourceToken.chainId as Hex],
      );
    }
  }, [
    dispatch,
    initialSourceToken,
    selectedChainId,
    onSetRpcTarget,
    evmNetworkConfigurations,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  ]);
};
