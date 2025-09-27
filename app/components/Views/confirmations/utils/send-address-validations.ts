import { AddressBookControllerState } from '@metamask/address-book-controller';
import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';

import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import {
  areAddressesEqual,
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../util/address';
import {
  collectConfusables,
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../util/confusables';

export const shouldSkipValidation = ({
  toAddress,
  chainId,
  addressBook,
  internalAccounts,
}: {
  toAddress?: string;
  chainId?: string;
  addressBook: AddressBookControllerState['addressBook'];
  internalAccounts: InternalAccount[];
}): boolean => {
  if (!toAddress || !chainId) {
    return true;
  }
  const address = isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })
    ? toChecksumAddress(toAddress)
    : toAddress;

  // address is present in address book
  // address book is supported for Evm accounts only
  const existingContact =
    address && chainId && addressBook[chainId as Hex]?.[address];
  if (existingContact) {
    return true;
  }

  // sending to an internal account
  const internalAccount = internalAccounts.find((account) =>
    areAddressesEqual(account.address, address),
  );
  if (internalAccount) {
    return true;
  }

  return false;
};

const LOWER_CASED_BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
];

export const validateHexAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
  if (LOWER_CASED_BURN_ADDRESSES.includes(toAddress?.toLowerCase())) {
    return {
      error: strings('send.invalid_address'),
    };
  }

  const checksummedAddress = toChecksumAddress(toAddress);
  if (chainId) {
    const { AssetsContractController, NetworkController } = Engine.context;

    try {
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        chainId as Hex,
      );
      const symbol = await AssetsContractController.getERC721AssetSymbol(
        checksummedAddress,
        networkClientId,
      );
      if (symbol) {
        return {
          warning: strings('send.token_contract_warning'),
        };
      }
    } catch (e) {
      // Not a token address
    }
  }
  return {};
};

const SOLANA_BURN_ADDRESSES = [
  '1nc1nerator11111111111111111111111111111111',
  'So11111111111111111111111111111111111111112',
];

export const validateSolanaAddress = (
  toAddress: string,
): {
  error?: string;
  warning?: string;
} => {
  if (SOLANA_BURN_ADDRESSES.includes(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }

  if (!isSolanaAddress(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }
  return {};
};

export const getConfusableCharacterInfo = (toAddress: string) => {
  const confusableCollection = collectConfusables(toAddress);
  if (confusableCollection.length) {
    const invalidAddressMessage = strings('transaction.invalid_address');
    const confusableCharacterWarningMessage = `${strings(
      'transaction.confusable_msg',
    )} - ${getConfusablesExplanations(confusableCollection)}`;
    const invisibleCharacterWarningMessage = strings(
      'send.invisible_character_error',
    );
    const isError = confusableCollection.some(hasZeroWidthPoints);
    if (isError) {
      // Show ERROR for zero-width characters (more important than warning)
      return {
        error: invalidAddressMessage,
        warning: invisibleCharacterWarningMessage,
      };
    }
    // Show WARNING for confusable characters
    return {
      warning: confusableCharacterWarningMessage,
    };
  }
  return {};
};
