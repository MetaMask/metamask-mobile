import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { performEvmTokenRefresh } from './tokenRefreshUtils';

interface RefreshTokensProps {
  isSolanaSelected: boolean;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  selectedAccountId?: InternalAccount['id'];
}

/**
 * Refreshes token data (detection, balances, rates).
 * Does NOT refresh account balance - that's handled by refreshSharedContent in Wallet.
 */
export const refreshTokens = async ({
  isSolanaSelected,
  evmNetworkConfigurationsByChainId,
  selectedAccountId,
}: RefreshTokensProps) => {
  if (isSolanaSelected) {
    const { MultichainBalancesController } = Engine.context;
    if (selectedAccountId) {
      try {
        await MultichainBalancesController.updateBalance(selectedAccountId);
      } catch (error) {
        Logger.error(error as Error, 'Error while refreshing NonEvm tokens');
      }
    }
  }
  await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
};
