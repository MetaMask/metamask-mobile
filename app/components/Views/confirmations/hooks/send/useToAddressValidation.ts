import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  areAddressesEqual,
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
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export interface ShouldSkipValidationArgs {
  toAddress?: string;
  chainId?: string;
  internalAccounts: InternalAccount[];
}

export const shouldSkipValidation = ({
  toAddress,
  chainId,
  internalAccounts,
}: ShouldSkipValidationArgs): boolean => {
  if (!toAddress || !chainId) {
    return true;
  }
  const address = isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })
    ? toChecksumAddress(toAddress)
    : toAddress;

  // sending to an internal account
  const internalAccount = internalAccounts.find((account) =>
    areAddressesEqual(account.address, address),
  );
  if (internalAccount) {
    return true;
  }

  return false;
};

const validateEVMHexAddress = async (
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

const validateEVMENSAddress = async (
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

export const validateEVMToAddress = async (
  toAddress: string,
  chainId?: Hex,
): Promise<{
  error?: string;
  warning?: string;
}> => {
  if (isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })) {
    return await validateEVMHexAddress(toAddress, chainId);
  }
  if (isENS(toAddress)) {
    return await validateEVMENSAddress(toAddress, chainId);
  }
  // address that is not valid hex or ens is invalid
  return {
    error: strings('transaction.invalid_address'),
  };
};

export const validateSolanaToAddress = (toAddress: string) => {
  if (!isSolanaAddress(toAddress)) {
    return {
      error: strings('transaction.invalid_address'),
    };
  }
  // todo: solana sns name validation
  return {};
};

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for receipient `toInput` and `toResolved`
export const useToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();

  const { value } = useAsyncResult<{
    error?: string;
    warning?: string;
  }>(async () => {
    if (
      shouldSkipValidation({
        toAddress: to,
        chainId,
        internalAccounts,
      })
    ) {
      return {};
    }
    if (isEvmSendType) {
      return await validateEVMToAddress(to as Hex, chainId as Hex);
    }
    if (isSolanaSendType) {
      return validateSolanaToAddress(to as string);
    }
    return {};
  }, [
    chainId,
    isEvmSendType,
    isSolanaSendType,
    internalAccounts,
    to,
    validateEVMToAddress,
  ]);

  const { error, warning } = value ?? {};

  return {
    toAddressError: error,
    toAddressWarning: warning,
  };
};
