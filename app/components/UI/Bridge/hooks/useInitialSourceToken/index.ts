import {
  selectSourceToken,
  setSourceAmount,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { BridgeToken } from '../../types';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
  formatChainIdToCaip,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { constants } from 'ethers';
import { SolScope } from '@metamask/keyring-api';
import usePrevious from '../../../../hooks/usePrevious';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
} from '../../../../../selectors/multichainNetworkController';

export const getNativeSourceToken = (chainId: Hex | CaipChainId) => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  // getNativeAssetForChainId returns zero address for Solana, we need the assetId to get balances properly for native SOL
  const address = isSolanaChainId(chainId)
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

  const chainId = isEvmNetworkSelected
    ? selectedEvmChainId
    : selectedNonEvmNetworkChainId;

  // Will default to the native token of the current chain if no token is provided
  if (!initialSourceToken && !sourceToken) {
    dispatch(setSourceToken(getNativeSourceToken(chainId)));
    return;
  }

  if (prevInitialSourceToken === initialSourceToken) return;

  // Fix for the case where the initial source token is the native token of the current chain
  if (initialSourceToken?.address === constants.AddressZero) {
    // Set the source token
    dispatch(setSourceToken(getNativeSourceToken(initialSourceToken?.chainId)));
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
      if (sourceCaipChainId === SolScope.Mainnet) {
        onNonEvmNetworkChange(SolScope.Mainnet);
        return;
      }

      const hexChainId = formatChainIdToHex(sourceCaipChainId);
      onSetRpcTarget(evmNetworkConfigurations[hexChainId]);
    }
  }
};
