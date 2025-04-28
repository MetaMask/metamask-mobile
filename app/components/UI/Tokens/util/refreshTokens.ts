import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { performEvmRefresh } from './tokenRefreshUtils';

interface RefreshTokensProps {
  isEvmSelected: boolean;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  nativeCurrencies: string[];
  selectedAccount?: InternalAccount;
}

export const refreshTokens = async ({
  isEvmSelected,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
  selectedAccount,
}: RefreshTokensProps) => {
  if (!isEvmSelected) {
    const { MultichainBalancesController } = Engine.context;
    if (selectedAccount) {
      try {
        await MultichainBalancesController.updateBalance(selectedAccount.id);
      } catch (error) {
        Logger.error(error as Error, 'Error while refreshing NonEvm tokens');
      }
    }
    return;
  }

  await performEvmRefresh(evmNetworkConfigurationsByChainId, nativeCurrencies);
};
