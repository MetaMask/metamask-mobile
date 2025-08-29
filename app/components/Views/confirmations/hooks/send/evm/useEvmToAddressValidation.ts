import { AddressBookControllerState } from '@metamask/address-book-controller';
import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import {
  areAddressesEqual,
  isENS,
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../../../util/address';
import { doENSLookup } from '../../../../../../util/ENSUtils';
import {
  collectConfusables,
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../../../util/confusables';
import { selectAddressBook } from '../../../../../../selectors/addressBookController';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useSendContext } from '../../../context/send-context';

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

const validateHexAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
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
        // todo: i18n to be implemented depending on the designs
        return {
          warning:
            'This address is a token contract address. If you send tokens to this address, you will lose them.',
        };
      }
    } catch (e) {
      // Not a token address
    }
  }
  return {};
};

const validateENSAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
  const resolvedAddress = await doENSLookup(toAddress, chainId);
  // ENS could not be resolved
  if (!resolvedAddress) {
    return { error: strings('transaction.could_not_resolve_ens') };
  }
  // ENS resolved but has, confusing character in it
  const confusableCollection = collectConfusables(toAddress);
  if (confusableCollection.length) {
    // todo: message may need to be improved depending on the designs
    const message = `${strings(
      'transaction.confusable_msg',
    )} - ${getConfusablesExplanations(confusableCollection)}`;
    const isError = confusableCollection.some(hasZeroWidthPoints);
    if (isError) {
      return {
        error: message,
      };
    }
    return {
      warning: message,
    };
  }
  return {};
};

export const validateToAddress = async ({
  toAddress,
  chainId,
  addressBook,
  internalAccounts,
}: {
  toAddress: string;
  chainId?: Hex;
  addressBook: AddressBookControllerState['addressBook'];
  internalAccounts: InternalAccount[];
}): Promise<{
  error?: string;
  warning?: string;
}> => {
  if (
    shouldSkipValidation({
      toAddress,
      chainId,
      addressBook,
      internalAccounts,
    })
  ) {
    return {};
  }
  if (isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })) {
    return await validateHexAddress(toAddress, chainId);
  }
  if (isENS(toAddress)) {
    return await validateENSAddress(toAddress, chainId);
  }
  // address that is not valid hex or ens is invalid
  return {
    error: strings('transaction.invalid_address'),
  };
};

export const useEvmToAddressValidation = () => {
  const addressBook = useSelector(selectAddressBook);
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId } = useSendContext();

  const validateEvmToAddress = useCallback(
    async (addressInputToValidate: string) =>
      await validateToAddress({
        toAddress: addressInputToValidate as Hex,
        chainId: chainId as Hex,
        addressBook,
        internalAccounts,
      }),
    [addressBook, chainId, internalAccounts],
  );

  return { validateEvmToAddress };
};
