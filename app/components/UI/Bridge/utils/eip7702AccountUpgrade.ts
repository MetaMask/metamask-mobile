import type { NetworkConfiguration } from '@metamask/network-controller';
import {
  TransactionEnvelopeType,
  type TransactionParams,
} from '@metamask/transaction-controller';
import { isStrictHexString, type Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { accountSupports7702 } from '../../../../util/transactions/account-supports-7702';

export type EIP7702AccountUpgradeStatus =
  | { isUpgradeRequired: false }
  | {
      isUpgradeRequired: true;
      address: Hex;
      upgradeContractAddress: Hex;
    };

export function createEIP7702UpgradeTransactionParams(
  address: Hex,
  upgradeContractAddress: Hex,
): TransactionParams {
  return {
    authorizationList: [{ address: upgradeContractAddress }],
    from: address,
    to: address,
    type: TransactionEnvelopeType.setCode,
  };
}

export async function getEIP7702AccountUpgradeStatus(
  address: string | undefined,
  networkConfiguration: NetworkConfiguration | undefined,
): Promise<EIP7702AccountUpgradeStatus> {
  if (!isStrictHexString(address)) {
    throw new Error('A valid source wallet address is required');
  }

  if (!networkConfiguration) {
    throw new Error('Network configuration is required for account upgrade');
  }

  const supports7702 = await accountSupports7702(
    address,
    Engine.context.KeyringController,
  );
  if (!supports7702) {
    throw new Error('Account does not support EIP-7702');
  }

  const [networkSupport] =
    await Engine.context.TransactionController.isAtomicBatchSupported({
      address,
      chainIds: [networkConfiguration.chainId],
    });

  if (!networkSupport) {
    throw new Error('Network does not support EIP-7702');
  }

  if (networkSupport.isSupported) {
    return { isUpgradeRequired: false };
  }

  if (networkSupport.delegationAddress) {
    throw new Error(
      'Account is delegated to an unsupported smart account implementation',
    );
  }

  const { upgradeContractAddress } = networkSupport;
  if (!upgradeContractAddress) {
    throw new Error('EIP-7702 upgrade contract address is unavailable');
  }

  return { isUpgradeRequired: true, address, upgradeContractAddress };
}
