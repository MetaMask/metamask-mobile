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
import { useEIP7702Accounts } from '../../../../Views/confirmations/hooks/7702/useEIP7702Accounts';
import { getEIP7702AccountUpgradeStatus } from '../../utils/eip7702AccountUpgrade';

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
    const upgradeStatus = await getEIP7702AccountUpgradeStatus(
      address,
      networkConfiguration,
    );
    if (!upgradeStatus.isUpgradeRequired) {
      return;
    }

    await awaitTransactionConfirmed({
      messenger:
        Engine.controllerMessenger as unknown as AwaitTransactionConfirmedMessenger,
      submit: () =>
        upgradeAccount(
          upgradeStatus.address,
          upgradeStatus.upgradeContractAddress,
        ),
    });
  }, [address, networkConfiguration, upgradeAccount]);
}
