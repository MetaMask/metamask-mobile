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
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { areAddressesEqual } from '../../../../../util/address';
import { constants } from 'ethers';
import usePrevious from '../../../../hooks/usePrevious';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../../../selectors/multichainNetworkController';
import { useEffect, useCallback } from 'react';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { CaipChainId, Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';

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

  /**
   * Switches to the appropriate network if the token's chain differs from current chain.
   * @returns true if network switch was initiated, false otherwise
   */
  const handleNetworkSwitch = useCallback(
    (tokenChainId: Hex | CaipChainId): boolean => {
      const tokenCaipChainId = formatChainIdToCaip(tokenChainId);
      const currentCaipChainId = formatChainIdToCaip(chainId);

      if (tokenCaipChainId !== currentCaipChainId) {
        if (isNonEvmChainId(tokenCaipChainId)) {
          onNonEvmNetworkChange(tokenCaipChainId);
          return true;
        }

        const hexChainId = formatChainIdToHex(tokenCaipChainId);
        onSetRpcTarget(
          evmNetworkConfigurations[hexChainId] as NetworkConfiguration,
        );
        return true;
      }
      return false;
    },
    [chainId, evmNetworkConfigurations, onNonEvmNetworkChange, onSetRpcTarget],
  );

  useEffect(() => {
    // If initial source token is already set in Redux (pre-populated before navigation),
    // only handle network switching if needed.
    // Must compare both address AND chainId since native tokens on different chains
    // share the same zero address (0x0000...0000)
    if (
      initialSourceToken &&
      sourceToken?.chainId &&
      areAddressesEqual(sourceToken.address, initialSourceToken.address) &&
      formatChainIdToCaip(sourceToken.chainId) ===
        formatChainIdToCaip(initialSourceToken.chainId)
    ) {
      // Set source amount if provided
      if (initialSourceAmount) {
        dispatch(setSourceAmount(initialSourceAmount));
      }

      // Change network if necessary
      if (initialSourceToken.chainId) {
        handleNetworkSwitch(initialSourceToken.chainId);
      }
      return;
    }

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
      handleNetworkSwitch(initialSourceToken.chainId);
    }
  }, [
    initialSourceToken,
    sourceToken,
    chainId,
    dispatch,
    initialSourceAmount,
    prevInitialSourceToken,
    bip44DefaultPair,
    handleNetworkSwitch,
  ]);
};
