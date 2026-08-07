import {
  BtcScope,
  SolScope,
  TrxScope,
  ///: BEGIN:ONLY_INCLUDE_IF(stellar)
  XlmScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { WalletClientType } from '../types';

export function getMultichainAccountName(
  scope?: CaipChainId,
  clientType?: WalletClientType,
) {
  const nextAvailableAccountName = '';
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
    case WalletClientType.Tron: {
      if (scope === TrxScope.Mainnet) {
        accountNameToUse = `${strings(
          'accounts.labels.tron_account_name',
        )} ${accountNumber}`;
      } else if (scope === TrxScope.Nile) {
        accountNameToUse = `${strings(
          'accounts.labels.tron_nile_account_name',
        )} ${accountNumber}`;
      } else if (scope === TrxScope.Shasta) {
        accountNameToUse = `${strings(
          'accounts.labels.tron_shasta_account_name',
        )} ${accountNumber}`;
      }
      break;
    }
    ///: BEGIN:ONLY_INCLUDE_IF(stellar)
    case WalletClientType.Stellar: {
      if (scope === XlmScope.Testnet) {
        accountNameToUse = `${strings(
          'accounts.labels.stellar_testnet_account_name',
        )} ${accountNumber}`;
      } else {
        accountNameToUse = `${strings(
          'accounts.labels.stellar_account_name',
        )} ${accountNumber}`;
      }
      break;
    }
    ///: END:ONLY_INCLUDE_IF
    default:
      break;
  }
  return accountNameToUse;
}
