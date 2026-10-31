import {
  AccountWalletPayloadType,
  type AccountTreePayload,
  type AccountWalletMnemonicPayload,
} from '@metamask/account-tree-controller';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { encodeMnemonicWords } from '@metamask/keyring-sdk';
import { getChecksumAddress, type Hex } from '@metamask/utils';
import { validateMnemonic } from '@metamask/scure-bip39';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

/** Caps HD derivation so a corrupt group index cannot walk the tree unbound. */
const MAX_ACCOUNTS_PER_SRP = 128;

export interface ImportedAccountRow {
  id: string;
  name: string;
  address: string;
}

export interface ImportedAccountSection {
  id: string;
  walletName: string;
  accounts: ImportedAccountRow[];
}

const isMnemonicWallet = (
  wallet: AccountTreePayload['wallets'][number],
): wallet is AccountWalletMnemonicPayload =>
  wallet.type === AccountWalletPayloadType.Mnemonic;

const deriveAddressesForGroups = async (
  mnemonicValue: number[] | undefined,
  groupIndexes: number[],
): Promise<Map<number, string>> => {
  const indexes = groupIndexes.filter(
    (index) => index >= 0 && index < MAX_ACCOUNTS_PER_SRP,
  );
  if (!mnemonicValue || indexes.length === 0) {
    return new Map();
  }

  let mnemonic: string;
  try {
    mnemonic = encodeMnemonicWords(new Uint8Array(mnemonicValue));
  } catch {
    return new Map();
  }

  if (!validateMnemonic(mnemonic, wordlist)) {
    return new Map();
  }

  const keyring = new HdKeyring();
  try {
    await keyring.deserialize({ mnemonic, numberOfAccounts: 0 });
    await keyring.addAccounts(Math.max(...indexes) + 1);
    const accounts = await keyring.getAccounts();
    const addresses = new Map<number, string>();
    indexes.forEach((index) => {
      const address = accounts[index];
      if (address) {
        addresses.set(index, getChecksumAddress(address as Hex));
      }
    });
    return addresses;
  } catch {
    return new Map();
  }
};

/**
 * Display rows for the accounts-imported screen.
 * Names come from secrets-stripped metadata. Addresses are derived once from
 * the in-memory mnemonic and are the only secret-derived values returned.
 */
export const buildImportedAccountSections = async (
  provisioningMetadata: AccountTreePayload | null,
  pendingSecretImports: AccountTreePayload | null,
): Promise<ImportedAccountSection[]> => {
  const metadataWallets = (provisioningMetadata?.wallets ?? []).filter(
    isMnemonicWallet,
  );
  const secretWallets = (pendingSecretImports?.wallets ?? []).filter(
    isMnemonicWallet,
  );
  const sourceWallets =
    metadataWallets.length > 0 ? metadataWallets : secretWallets;

  const sections: ImportedAccountSection[] = [];

  for (const wallet of sourceWallets) {
    const secretWallet = secretWallets.find((entry) => entry.id === wallet.id);
    const addresses = await deriveAddressesForGroups(
      secretWallet?.value ?? wallet.value,
      wallet.groups.map((group) => group.groupIndex),
    );

    sections.push({
      id: wallet.id,
      walletName: wallet.metadata?.name ?? 'Wallet',
      accounts: wallet.groups.map((group) => ({
        id: group.id,
        name: group.metadata?.name ?? `Account ${group.groupIndex + 1}`,
        address: addresses.get(group.groupIndex) ?? '',
      })),
    });
  }

  return sections;
};
