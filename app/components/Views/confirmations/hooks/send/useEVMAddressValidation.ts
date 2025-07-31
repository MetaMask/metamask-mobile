import { AddressBookControllerState } from '@metamask/address-book-controller';
import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  isENS,
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../../util/address';
import { isMainnetByChainId } from '../../../../../util/networks';
import { doENSLookup } from '../../../../../util/ENSUtils';
import {
  collectConfusables,
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../../util/confusables';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useSendContext } from '../../context/send-context';

export interface ShouldSkipValidationArgs {
  toAddress?: string;
  chainId?: string;
  addressBook: AddressBookControllerState['addressBook'];
  internalAccounts: InternalAccount[];
  isEvmSendType?: boolean;
}

const validateHexAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
  const checksummedAddress = toChecksumAddress(toAddress);
  if (chainId) {
    const isMainnet = isMainnetByChainId(chainId);
    const { AssetsContractController } = Engine.context;
    // Check if it's token contract address on mainnet
    if (isMainnet) {
      try {
        const symbol = await AssetsContractController.getERC721AssetSymbol(
          checksummedAddress,
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

export const validateToAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
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

export const useEVMToAddressValidation = () => {
  const addressBook = useSelector(selectAddressBook);
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();

  const { value } = useAsyncResult<{
    error?: string;
    warning?: string;
  }>(async () => {
    // address is present in address book
    // address book is supported for EVM accounts only
    const address = toChecksumAddress(to as Hex);
    const existingContact =
      address && chainId && addressBook[chainId as Hex]?.[address];
    if (existingContact) {
      return {};
    }

    return await validateToAddress(to as Hex, chainId as Hex);
  }, [addressBook, chainId, internalAccounts, to]);

  const { error, warning } = value ?? {};

  return { error, warning };
};
