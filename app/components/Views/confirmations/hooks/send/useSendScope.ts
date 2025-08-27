import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

interface SendScope {
  account?: InternalAccount;
  isSolanaOnly?: boolean;
  isEvmOnly?: boolean;
  isBIP44?: boolean;
}

// This hook is temporary solution to handle separated send flows for evm and solana
// And will be removed after version `7.55`
export function useSendScope(): SendScope {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const sendScope: SendScope = {
    isSolanaOnly: false,
    isEvmOnly: false,
    isBIP44: false,
  };

  if (isMultichainAccountsState2Enabled) {
    return {
      isBIP44: true,
      isSolanaOnly: false,
      isEvmOnly: false,
    };
  }

  if (selectedAccount?.type.includes('solana')) {
    sendScope.isSolanaOnly = true;
  } else if (selectedAccount?.type.includes('eip155')) {
    sendScope.isEvmOnly = true;
  }

  return sendScope;
}
