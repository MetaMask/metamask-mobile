import {
  CHAIN_IDS,
  TransactionType,
  type TransactionParams,
  type SecurityAlertResponse,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { ParseOutput } from 'eth-url-parser';
import { v4 as uuid } from 'uuid';

import { selectConfirmationRedesignFlagsFromRemoteFeatureFlags } from '../../../../selectors/featureFlagController/confirmations';
import { addTransaction } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { safeToChecksumAddress } from '../../../../util/address';
import { getGlobalNetworkClientId } from '../../../../util/networks/global-network';
import { ETH_ACTIONS } from '../../../../constants/deeplinks';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import ppomUtil from '../../../../lib/ppom/ppom-util';

export type DeeplinkRequest = ParseOutput & { origin: string };

const getNetworkClientIdForChainId = (chainId: Hex) => {
  const { NetworkController } = Engine.context;
  const selectedNetworkClientId = getGlobalNetworkClientId();
  try {
    return (
      NetworkController.findNetworkClientIdByChainId(chainId) ??
      selectedNetworkClientId
    );
  } catch {
    return selectedNetworkClientId;
  }
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
  origin,
}: DeeplinkRequest) {
  const { AccountsController } = Engine.context;

  // Temporary solution for preventing back to back deeplink requests
  if (isAddingDeeplinkTransaction) {
    Logger.log('Cannot add another deeplink transaction');
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

  const networkClientId = getNetworkClientIdForChainId(chainId);
  const from = safeToChecksumAddress(selectedAccountAddress) as string;
  const to = safeToChecksumAddress(target_address);
  const checkSummedParamAddress = safeToChecksumAddress(
    parameters?.address ?? '',
  );

  const isErc20Transfer = function_name === ETH_ACTIONS.TRANSFER;

  const txParams: TransactionParams = isErc20Transfer
    ? {
        from,
        to,
        data: generateTransferData('transfer', {
          toAddress: checkSummedParamAddress,
          amount: toHex(parameters?.uint256 as string),
        }),
      }
    : {
        from,
        to,
        value: toHex(parameters?.value as string),
      };

  const transactionType = isErc20Transfer
    ? TransactionType.tokenMethodTransfer
    : TransactionType.simpleSend;

  const securityAlertResponse = validateWithPPOM({
    txParams,
    origin,
    chainId,
    networkClientId,
  });

  await addTransaction(txParams, {
    networkClientId,
    origin,
    type: transactionType,
    securityAlertResponse,
  });

  isAddingDeeplinkTransaction = false;
}

export function validateWithPPOM({
  txParams,
  origin,
  chainId,
  networkClientId,
}: {
  txParams: TransactionParams;
  origin: string;
  chainId: Hex;
  networkClientId: string;
}) {
  const securityAlertId = uuid();
  ppomUtil.validateRequest(
    {
      id: securityAlertId,
      jsonrpc: '2.0',
      method: 'eth_sendTransaction',
      origin,
      params: [txParams],
    },
    {
      transactionMeta: {
        chainId,
        networkClientId,
        txParams,
      } as TransactionMeta,
      securityAlertId,
    },
  );
  return { securityAlertId } as SecurityAlertResponse;
}
