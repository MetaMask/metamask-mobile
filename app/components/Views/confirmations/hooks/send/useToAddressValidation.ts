import { Hex } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import { isENS, isValidHexAddress } from '../../../../../util/address';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import {
  shouldSkipValidation,
  validateHexAddress,
  validateSolanaAddress,
} from '../../utils/send-address-validations';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useNameValidation } from './useNameValidation';

export const useToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const addressBook = useSelector(selectAddressBook);
  const { chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateName } = useNameValidation();

  const validateToAddress = useCallback(async () => {
    if (
      !to ||
      shouldSkipValidation({
        toAddress: to,
        chainId,
        addressBook,
        internalAccounts,
      })
    ) {
      return { toAddressValidated: to };
    }

    if (
      isEvmSendType &&
      isValidHexAddress(to, { mixedCaseUseChecksum: true })
    ) {
      return await validateHexAddress(to, chainId as Hex);
    }

    if (isSolanaSendType && isSolanaAddress(to)) {
      return validateSolanaAddress(to);
    }

    if (isENS(to)) {
      return await validateName();
    }

    return {
      error: strings('send.invalid_address'),
      toAddressValidated: to,
    };
  }, [
    addressBook,
    chainId,
    internalAccounts,
    isEvmSendType,
    isSolanaSendType,
    to,
    validateName,
  ]);

  const { value, pending } = useAsyncResult<{
    toAddressValidated?: string;
    error?: string;
    warning?: string;
    loading?: boolean;
    resolvedAddress?: string;
  }>(async () => validateToAddress(), [validateToAddress]);

  const {
    toAddressValidated,
    error: toAddressError,
    warning: toAddressWarning,
    loading = false,
    resolvedAddress,
  } = value ?? {};

  return {
    loading: loading || pending,
    resolvedAddress,
    toAddressError,
    toAddressValidated,
    toAddressWarning,
  };
};
