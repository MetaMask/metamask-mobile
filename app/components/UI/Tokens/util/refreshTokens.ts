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
  selectedAccountId?: InternalAccount['id'];
}

export const refreshTokens = async ({
  isEvmSelected,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
  selectedAccountId,
}: RefreshTokensProps) => {
  if (!isEvmSelected) {
    const { MultichainBalancesController } = Engine.context;
    if (selectedAccountId) {
      try {
        await MultichainBalancesController.updateBalance(selectedAccountId);
      } catch (error) {
        Logger.error(error as Error, 'Error while refreshing NonEvm tokens');
      }
    }
    return;
  }

  await performEvmRefresh(evmNetworkConfigurationsByChainId, nativeCurrencies);
};
