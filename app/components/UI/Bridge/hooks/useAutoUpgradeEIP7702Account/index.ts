import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { isStrictHexString } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { accountSupports7702 } from '../../../../../util/transactions/account-supports-7702';
import { useEIP7702Accounts } from '../../../../Views/confirmations/hooks/7702/useEIP7702Accounts';

export function useAutoUpgradeEIP7702Account() {
  const address = useSelector(selectSourceWalletAddress);
  const sourceToken = useSelector(selectSourceToken);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const sourceChainId = sourceToken?.chainId;
  const networkConfiguration = isStrictHexString(sourceChainId)
    ? networkConfigurations[sourceChainId]
    : undefined;
  const { upgradeAccount } = useEIP7702Accounts(networkConfiguration, {
    requireApproval: false,
  });

  return useCallback(async (): Promise<void> => {
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
      return;
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

    await awaitTransactionConfirmed({
      messenger:
        Engine.controllerMessenger as unknown as AwaitTransactionConfirmedMessenger,
      submit: () => upgradeAccount(address, upgradeContractAddress),
    });
  }, [address, networkConfiguration, upgradeAccount]);
}
