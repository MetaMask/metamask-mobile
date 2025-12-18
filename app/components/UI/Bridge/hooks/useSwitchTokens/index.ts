import { useSelector, useDispatch } from 'react-redux';
import {
  setSourceToken,
  setDestToken,
  selectDestToken,
  selectSourceToken,
  setSelectedDestChainId,
  setSourceAmount,
  setIsDestTokenManuallySet,
} from '../../../../../core/redux/slices/bridge';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import Engine from '../../../../../core/Engine';

export const useSwitchTokens = () => {
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  const {
    chainId: selectedEvmChainId, // Will be the most recently selected EVM chain if you are on Solana
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
    selectedChainId: selectedEvmChainId,
    selectedNetworkName,
  });
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const handleSwitchTokens = (destTokenAmount?: string) => async () => {
    // Reset BridgeController state to prevent stale quotes
    if (Engine.context.BridgeController?.resetState) {
      Engine.context.BridgeController.resetState();
    }

    // Switch tokens
    if (sourceToken && destToken) {
      dispatch(setSourceToken(destToken));
      dispatch(setDestToken(sourceToken));
      // Mark dest as manually set since user explicitly chose to flip
      dispatch(setIsDestTokenManuallySet(true));
      // Swap amounts
      dispatch(setSourceAmount(destTokenAmount));

      if (sourceToken.chainId !== destToken.chainId) {
        dispatch(setSelectedDestChainId(sourceToken.chainId));

        if (isNonEvmChainId(destToken.chainId)) {
          await onNonEvmNetworkChange(destToken.chainId as CaipChainId);
        } else {
          const evmNetworkConfiguration =
            evmNetworkConfigurations[destToken.chainId as Hex];

          if (evmNetworkConfiguration) {
            await onSetRpcTarget(evmNetworkConfiguration);
          }
        }
      }
    }
  };

  return {
    handleSwitchTokens,
  };
};
