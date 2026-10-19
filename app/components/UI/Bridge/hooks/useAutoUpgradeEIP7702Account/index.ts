import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatChainIdToHex } from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useEIP7702Accounts } from '../../../../Views/confirmations/hooks/7702/useEIP7702Accounts';
import { getEIP7702AccountUpgradeStatus } from '../../utils/eip7702AccountUpgrade';

interface AutoUpgradeEIP7702AccountOptions {
  address: string | undefined;
  chainId: string | undefined;
}

function normalizeEvmChainId(chainId: string | undefined) {
  if (!chainId) return undefined;

  try {
    return formatChainIdToHex(chainId);
  } catch {
    return undefined;
  }
}

export function useAutoUpgradeEIP7702Account({
  address,
  chainId,
}: AutoUpgradeEIP7702AccountOptions) {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const hexChainId = normalizeEvmChainId(chainId);
  const networkConfiguration = hexChainId
    ? networkConfigurations[hexChainId]
    : undefined;
  const { upgradeAccount: submitUpgradeAccount } = useEIP7702Accounts(
    networkConfiguration,
    {
      requireApproval: false,
    },
  );

  const getUpgradeStatus = useCallback(
    () => getEIP7702AccountUpgradeStatus(address, networkConfiguration),
    [address, networkConfiguration],
  );

  const autoUpgradeEIP7702Account = useCallback(async (): Promise<void> => {
    const upgradeStatus = await getUpgradeStatus();
    if (!upgradeStatus.isUpgradeRequired) {
      return;
    }

    await awaitTransactionConfirmed({
      messenger:
        Engine.controllerMessenger as unknown as AwaitTransactionConfirmedMessenger,
      submit: () =>
        submitUpgradeAccount(
          upgradeStatus.address,
          upgradeStatus.upgradeContractAddress,
        ),
    });
  }, [getUpgradeStatus, submitUpgradeAccount]);

  return useMemo(
    () => ({ autoUpgradeEIP7702Account, getUpgradeStatus }),
    [autoUpgradeEIP7702Account, getUpgradeStatus],
  );
}
