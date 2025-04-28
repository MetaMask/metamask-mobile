import {
  CHAIN_IDS,
  TransactionType,
  type TransactionParams,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

import { selectConfirmationRedesignFlagsFromRemoteFeatureFlags } from '../../../../selectors/featureFlagController/confirmations';
import { addTransaction } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { safeToChecksumAddress } from '../../../../util/address';
import { ETH_ACTIONS } from '../../../../constants/deeplinks';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

const getSelectedNetworkClientId = () => {
  const { NetworkController } = Engine.context;
  return NetworkController.state.selectedNetworkClientId;
};

const getNetworkClientIdForChainId = (chainId: Hex) => {
  const { NetworkController } = Engine.context;
  const { rpcEndpoints } =
    NetworkController.state.networkConfigurationsByChainId[chainId];

  const selectedNetworkClientId = getSelectedNetworkClientId();

  const isSelectedNetworkClientIdInRpcEndpoints = rpcEndpoints.some(
    (rpcEndpoint) => rpcEndpoint.networkClientId === selectedNetworkClientId,
  );

  if (!isSelectedNetworkClientIdInRpcEndpoints) {
    // Return first match
    return rpcEndpoints[0].networkClientId;
  }

  return selectedNetworkClientId;
};

export function isDeeplinkRedesignedConfirmationCompatible(
  functionName?: string,
) {
  const { RemoteFeatureFlagController } = Engine.context;
  const { remoteFeatureFlags } = RemoteFeatureFlagController.state;

  const confirmationRedesignFlags =
    selectConfirmationRedesignFlagsFromRemoteFeatureFlags(remoteFeatureFlags);

  switch (functionName) {
    case ETH_ACTIONS.TRANSFER: {
      return confirmationRedesignFlags.transfer;
    }
    case ETH_ACTIONS.APPROVE: {
      return false;
    }
    default: {
      return confirmationRedesignFlags.transfer;
    }
  }
}

// This will prevent back to back deeplink requests
// It will be removed once `DeeplinkManager.parse` is called once per request
let isAddingDeeplinkTransaction = false;

export async function addTransactionForDeeplink({
  chain_id,
  function_name,
  parameters,
  target_address,
}: {
  chain_id?: string;
  function_name?: string;
  parameters?: Record<string, string>;
  target_address: string;
}) {
  const { AccountsController } = Engine.context;

  // Temporary solution for preventing back to back deeplink requests
  if (isAddingDeeplinkTransaction) {
    Logger.error(new Error('Cannot add another deeplink transaction'));
    return;
  }

  isAddingDeeplinkTransaction = true;

  const selectedAccountAddress =
    AccountsController.getSelectedAccount().address;

  let chainId: Hex;
  if (chain_id) {
    chainId = toHex(chain_id as string);
  } else {
    // Deeplinks are fallback to mainnet rather than the selected network
    chainId = CHAIN_IDS.MAINNET;
  }

  // This should not anything except MMM in order to avoid layout issues in redesigned confirmations
  const origin = 'deeplink';
  const networkClientId = getNetworkClientIdForChainId(chainId);
  const from = safeToChecksumAddress(selectedAccountAddress) as string;
  const to = safeToChecksumAddress(target_address as string);
  const checkSummedParamAddress = safeToChecksumAddress(
    parameters?.address as string,
  );

  if (function_name === 'transfer') {
    // ERC20 transfer
    const txParams: TransactionParams = {
      from,
      to,
      data: generateTransferData('transfer', {
        toAddress: checkSummedParamAddress,
        amount: toHex(parameters?.uint256 as string),
      }),
    };

    await addTransaction(txParams, {
      networkClientId,
      origin,
      type: TransactionType.tokenMethodTransfer,
    });
  } else {
    // Native transfer
    const txParams: TransactionParams = {
      from,
      to,
      value: toHex(parameters?.value as string),
    };

    await addTransaction(txParams, {
      networkClientId,
      origin,
      type: TransactionType.simpleSend,
    });
  }

  isAddingDeeplinkTransaction = false;
}
