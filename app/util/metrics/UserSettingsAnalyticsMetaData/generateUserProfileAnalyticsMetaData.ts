import { Appearance } from 'react-native';
import { KeyringTypes } from '@metamask/keyring-controller';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { store } from '../../../store';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import { getConfiguredCaipChainIds } from '../MultichainAPI/networkMetricUtils';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Computes wallet composition traits from internalAccounts.
 * Uses AccountsController as the source of truth so traits remain accurate when the wallet is locked.
 */
export function getAccountCompositionTraits(
  internalAccounts: Record<string, InternalAccount>,
): AnalyticsUserTraits {
  const accountGroupKeys = new Set<string>();
  const hdEntropyIds = new Set<string>();
  let numberOfImportedAccounts = 0;
  let numberOfLedgerAccounts = 0;
  let numberOfTrezorAccounts = 0;
  let numberOfLatticeAccounts = 0;
  let numberOfQrHardwareAccounts = 0;

  for (const [accountId, account] of Object.entries(internalAccounts)) {
    const keyringType = account.metadata?.keyring?.type;

    switch (keyringType) {
      case KeyringTypes.simple:
        numberOfImportedAccounts += 1;
        break;
      case KeyringTypes.ledger:
        numberOfLedgerAccounts += 1;
        break;
      case KeyringTypes.trezor:
        numberOfTrezorAccounts += 1;
        break;
      case KeyringTypes.lattice:
        numberOfLatticeAccounts += 1;
        break;
      case KeyringTypes.qr:
      case KeyringTypes.oneKey:
        numberOfQrHardwareAccounts += 1;
        break;
      default:
        break;
    }

    // BIP44 multichain accounts share an entropy id and group index across all chains.
    // Deduplicating on that composite key counts account groups rather than individual addresses.
    const entropy = (account.options as { entropy?: unknown })?.entropy as
      | { type: string; id: string; groupIndex: number }
      | undefined;

    if (
      entropy?.type === KeyringAccountEntropyTypeOption.Mnemonic &&
      entropy.id &&
      entropy.groupIndex !== undefined
    ) {
      accountGroupKeys.add(`${entropy.id}:${entropy.groupIndex}`);
      hdEntropyIds.add(entropy.id);
    } else {
      accountGroupKeys.add(accountId);
    }
  }

  const numberOfHardwareWallets =
    (numberOfLedgerAccounts > 0 ? 1 : 0) +
    (numberOfTrezorAccounts > 0 ? 1 : 0) +
    (numberOfLatticeAccounts > 0 ? 1 : 0) +
    (numberOfQrHardwareAccounts > 0 ? 1 : 0);

  return {
    [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: hdEntropyIds.size,
    [UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]: accountGroupKeys.size,
    [UserProfileProperty.NUMBER_OF_IMPORTED_ACCOUNTS]: numberOfImportedAccounts,
    [UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]: numberOfLedgerAccounts,
    [UserProfileProperty.NUMBER_OF_TREZOR_ACCOUNTS]: numberOfTrezorAccounts,
    [UserProfileProperty.NUMBER_OF_LATTICE_ACCOUNTS]: numberOfLatticeAccounts,
    [UserProfileProperty.NUMBER_OF_QR_HARDWARE_ACCOUNTS]:
      numberOfQrHardwareAccounts,
    [UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]: numberOfHardwareWallets,
  };
}

/**
 * Generate user profile analytics meta data
 * To be used in the Segment identify call
 * Returns AnalyticsUserTraits-compatible object
 */
const generateUserProfileAnalyticsMetaData = (): AnalyticsUserTraits => {
  const reduxState = store.getState();
  const preferencesController =
    reduxState?.engine?.backgroundState?.PreferencesController;
  const appTheme = reduxState?.user?.appTheme;
  // This will return either "light" or "dark"
  const appThemeStyle =
    appTheme === 'os' ? Appearance.getColorScheme() : appTheme;
  const isDataCollectionForMarketingEnabled =
    reduxState?.security?.dataCollectionForMarketing;

  const chainIds = getConfiguredCaipChainIds();

  const internalAccounts =
    reduxState?.engine?.backgroundState?.AccountsController?.internalAccounts
      ?.accounts ?? {};

  const traits: AnalyticsUserTraits = {
    [UserProfileProperty.ENABLE_OPENSEA_API]:
      preferencesController?.displayNftMedia
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.NFT_AUTODETECTION]:
      preferencesController?.useNftDetection
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.THEME]: appThemeStyle ?? null,
    [UserProfileProperty.TOKEN_DETECTION]:
      preferencesController?.useTokenDetection
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.MULTI_ACCOUNT_BALANCE]:
      preferencesController?.isMultiAccountBalancesEnabled
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.SECURITY_PROVIDERS]:
      preferencesController?.securityAlertsEnabled ? 'blockaid' : '',
    [UserProfileProperty.HAS_MARKETING_CONSENT]: Boolean(
      isDataCollectionForMarketingEnabled,
    ),
    [UserProfileProperty.CHAIN_IDS]: chainIds,
    ...getAccountCompositionTraits(internalAccounts),
  };
  return traits;
};

export default generateUserProfileAnalyticsMetaData;
