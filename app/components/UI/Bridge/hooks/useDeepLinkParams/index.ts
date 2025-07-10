import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  isCaipAssetType,
  parseCaipAssetType,
  isHexString,
  Hex,
} from '@metamask/utils';
import {
  setSourceToken,
  setDestToken,
  setSourceAmount,
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
} from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../types';
import { getNativeSourceToken } from '../useInitialSourceToken';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF

interface UseDeepLinkParamsProps {
  from?: string; // CAIP-19 format
  to?: string; // CAIP-19 format
  amount?: string; // Amount in minimal divisible units
}

/**
 * Hook to handle deep link parameters for pre-filling the bridge view
 * Parses CAIP-19 format asset identifiers and sets source/destination tokens and amount
 */
export const useDeepLinkParams = ({
  from,
  to,
  amount,
}: UseDeepLinkParamsProps): void => {
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const hasProcessedDeepLink = useRef(false);

  // Current state to check if we should process deep link params
  const currentSourceToken = useSelector(selectSourceToken);
  const currentDestToken = useSelector(selectDestToken);
  const currentSourceAmount = useSelector(selectSourceAmount);

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

  useEffect(() => {
    // Only process deep link parameters once and if they exist
    if (hasProcessedDeepLink.current || (!from && !to && !amount)) {
      return;
    }

    // Helper function to create a BridgeToken from CAIP-19 format
    const createTokenFromCaip = (caipAssetType: string): BridgeToken | null => {
      try {
        if (!isCaipAssetType(caipAssetType)) {
          return null;
        }

        const parsedAsset = parseCaipAssetType(caipAssetType);
        const {
          assetNamespace,
          assetReference,
          chainId: tokenChainId,
        } = parsedAsset;

        // Handle native tokens (assetNamespace === 'slip44')
        if (assetNamespace === 'slip44') {
          return getNativeSourceToken(tokenChainId);
        }

        // Handle ERC-20 tokens (assetNamespace === 'erc20')
        if (assetNamespace === 'erc20') {
          return {
            address: assetReference,
            symbol: '', // Will be fetched later
            name: '',
            decimals: 18, // Default, will be updated
            chainId: tokenChainId,
          };
        }

        return null;
      } catch (error) {
        console.warn('Failed to parse CAIP asset type:', caipAssetType, error);
        return null;
      }
    };

    // Process source token (from parameter)
    if (from && !currentSourceToken) {
      const sourceToken = createTokenFromCaip(from);
      if (sourceToken) {
        dispatch(setSourceToken(sourceToken));

        // Switch network if necessary
        if (sourceToken.chainId !== selectedChainId) {
          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          if (sourceToken.chainId === SolScope.Mainnet) {
            onNonEvmNetworkChange(sourceToken.chainId);
          } else {
            ///: END:ONLY_INCLUDE_IF
            onSetRpcTarget(
              evmNetworkConfigurations[sourceToken.chainId as Hex],
            );
            ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          }
          ///: END:ONLY_INCLUDE_IF
        }
      }
    }

    // Process destination token (to parameter)
    if (to && !currentDestToken) {
      const destToken = createTokenFromCaip(to);
      if (destToken) {
        dispatch(setDestToken(destToken));
      }
    }

    // Amount processing is handled in a separate useEffect below

    hasProcessedDeepLink.current = true;
  }, [
    from,
    to,
    amount,
    dispatch,
    chainId,
    evmNetworkConfigurations,
    currentSourceToken,
    currentDestToken,
    currentSourceAmount,
    selectedChainId,
    onSetRpcTarget,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    onNonEvmNetworkChange,
    ///: END:ONLY_INCLUDE_IF
  ]);

  // Handle amount conversion after source token is set
  useEffect(() => {
    if (
      hasProcessedDeepLink.current &&
      amount &&
      !currentSourceAmount &&
      currentSourceToken?.decimals !== undefined
    ) {
      let processedAmount: string;

      if (isHexString(amount)) {
        // Convert hex to decimal string
        processedAmount = parseInt(amount, 16).toString();
      } else {
        // Assume it's already in decimal format
        processedAmount = amount;
      }

      // Convert from minimal divisible units to display units using the token's decimals
      const tokenDecimals = currentSourceToken.decimals;
      const displayAmount = (
        parseFloat(processedAmount) / Math.pow(10, tokenDecimals)
      ).toString();

      if (displayAmount !== '0') {
        dispatch(setSourceAmount(displayAmount));
      }
    }
  }, [amount, currentSourceAmount, currentSourceToken, dispatch]);
};
