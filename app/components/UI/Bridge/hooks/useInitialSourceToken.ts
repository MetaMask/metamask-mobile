import { useRoute, RouteProp } from '@react-navigation/native';
import { setSourceToken } from '../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { BridgeToken } from '../types';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import { useSwitchNetworks } from '../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../selectors/selectedNetworkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { constants } from 'ethers';
///: END:ONLY_INCLUDE_IF

interface BridgeRouteParams {
  token: BridgeToken;
}

export const useInitialSourceToken = () => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
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
      return;
    }

    // Fix for the case where the initial source token is the native token of the current chain
    if (initialSourceToken.address === constants.AddressZero) {
      const nativeSourceToken = getNativeAssetForChainId(
        initialSourceToken.chainId,
      );

      const nativeSourceTokenFormatted: BridgeToken = {
        address: nativeSourceToken.address,
        name: nativeSourceToken.name ?? '',
        symbol: nativeSourceToken.symbol,
        image: 'iconUrl' in nativeSourceToken ? nativeSourceToken.iconUrl : '',
        decimals: nativeSourceToken.decimals,
        chainId: initialSourceToken.chainId as Hex,
      };

      // Set the source token
      dispatch(setSourceToken(nativeSourceTokenFormatted));
    } else {
      // Set the source token
      dispatch(setSourceToken(initialSourceToken));
    }

    // Change network if necessary
    if (initialSourceToken.chainId !== chainId) {
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
    chainId,
    onSetRpcTarget,
    evmNetworkConfigurations,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  ]);
};
