import { Hex } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import { isENS, isValidHexAddress } from '../../../../../util/address';
import { selectAddressBook } from '../../../../../selectors/addressBookController';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import {
  shouldSkipValidation,
  validateHexAddress,
  validateSolanaAddress,
} from '../../utils/send-address-validations';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useNameValidation } from './useNameValidation';

interface ValidationResult {
  toAddressValidated?: string;
  error?: string;
  warning?: string;
  resolvedAddress?: string;
}

export const useToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const addressBook = useSelector(selectAddressBook);
  const { chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateName } = useNameValidation();
  const [result, setResult] = useState<ValidationResult>({});
  const [loading, setLoading] = useState(false);
  const prevAddressValidated = useRef<string>();

  const validateToAddress = useCallback(
    async (toAddress?: string) => {
      if (
        !toAddress ||
        !chainId ||
        shouldSkipValidation({
          toAddress,
          chainId,
          addressBook,
          internalAccounts,
        })
      ) {
        return {};
      }

      if (
        isEvmSendType &&
        isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })
      ) {
        return await validateHexAddress(toAddress, chainId as Hex);
      }

      if (isSolanaSendType && isSolanaAddress(toAddress)) {
        return validateSolanaAddress(toAddress);
      }

      if (isENS(toAddress)) {
        return await validateName(chainId, toAddress);
      }

      return {
        error: strings('send.invalid_address'),
      };
    },
    [
      addressBook,
      chainId,
      internalAccounts,
      isEvmSendType,
      isSolanaSendType,
      validateName,
    ],
  );

  useEffect(() => {
    if (prevAddressValidated.current === to) {
      return;
    }

    let cancel = false;

    (async () => {
      setLoading(true);
      const result = await validateToAddress(to);

      if (!cancel) {
        prevAddressValidated.current = to;
        setResult({ ...result, toAddressValidated: to });
        setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [setLoading, to, validateToAddress]);

  const {
    toAddressValidated,
    error: toAddressError,
    warning: toAddressWarning,
    resolvedAddress,
  } = result ?? {};

  return {
    loading,
    resolvedAddress,
    toAddressError,
    toAddressValidated,
    toAddressWarning,
  };
};
