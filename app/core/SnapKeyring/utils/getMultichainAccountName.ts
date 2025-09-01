import { BtcScope, SolScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import Engine from '../../Engine';
import { WalletClientType } from '../MultichainWalletSnapClient';

export function getMultichainAccountName(
  scope?: CaipChainId,
  clientType?: WalletClientType,
) {
  const nextAvailableAccountName =
    Engine.context.AccountsController.getNextAvailableAccountName(
      clientType ? KeyringTypes.snap : KeyringTypes.hd,
    );
  const accountNumber = nextAvailableAccountName.split(' ').pop();

  let accountNameToUse = nextAvailableAccountName;

  if (!clientType || !scope) {
    return accountNameToUse;
  }

  switch (clientType) {
    case WalletClientType.Bitcoin: {
      switch (scope) {
        case BtcScope.Testnet:
        case BtcScope.Testnet4:
          accountNameToUse = `${strings(
            'accounts.labels.bitcoin_testnet_account_name',
          )} ${accountNumber}`;
          break;
        case BtcScope.Signet:
          accountNameToUse = `${strings(
            'accounts.labels.bitcoin_signet_account_name',
          )} ${accountNumber}`;
          break;
        case BtcScope.Regtest:
          accountNameToUse = `${strings(
            'accounts.labels.bitcoin_regtest_account_name',
          )} ${accountNumber}`;
          break;
        default:
          accountNameToUse = `${strings(
            'accounts.labels.bitcoin_account_name',
          )} ${accountNumber}`;
          break;
      }
      break;
    }
    case WalletClientType.Solana: {
      switch (scope) {
        case SolScope.Devnet:
          accountNameToUse = `${strings(
            'accounts.labels.solana_devnet_account_name',
          )} ${accountNumber}`;
          break;
        case SolScope.Testnet:
          accountNameToUse = `${strings(
            'accounts.labels.solana_testnet_account_name',
          )} ${accountNumber}`;
          break;
        default:
          accountNameToUse = `${strings(
            'accounts.labels.solana_account_name',
          )} ${accountNumber}`;
          break;
      }
      break;
    }
    default:
      break;
  }
  return accountNameToUse;
}
