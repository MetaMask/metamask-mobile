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
// eslint-disable-next-line no-console -- TODO: Remove debug logs after testing
export const refreshTokens = async ({
  isSolanaSelected,
  evmNetworkConfigurationsByChainId,
  selectedAccountId,
}: RefreshTokensProps) => {
  console.log('[refreshTokens] START, isSolanaSelected:', isSolanaSelected); // eslint-disable-line no-console
  if (isSolanaSelected) {
    const { MultichainBalancesController } = Engine.context;
    if (selectedAccountId) {
      try {
        console.log('[refreshTokens] updating Solana balance...'); // eslint-disable-line no-console
        await MultichainBalancesController.updateBalance(selectedAccountId);
        console.log('[refreshTokens] Solana balance DONE'); // eslint-disable-line no-console
      } catch (error) {
        console.log('[refreshTokens] Solana balance ERROR:', error); // eslint-disable-line no-console
        Logger.error(error as Error, 'Error while refreshing NonEvm tokens');
      }
    }
  }
  console.log('[refreshTokens] calling performEvmTokenRefresh...'); // eslint-disable-line no-console
  await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
  console.log('[refreshTokens] DONE'); // eslint-disable-line no-console
};
