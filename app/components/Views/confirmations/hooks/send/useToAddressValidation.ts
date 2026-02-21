import { Hex } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';

import { strings } from '../../../../../../locales/i18n';
import {
  isResolvableName,
  isValidHexAddress,
} from '../../../../../util/address';
import { isBtcMainnetAddress } from '../../../../../core/Multichain/utils';
import {
  validateHexAddress,
  validateSolanaAddress,
  validateBitcoinAddress,
  validateTronAddress,
} from '../../utils/send-address-validations';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useNameValidation } from './useNameValidation';

interface ValidationResult {
  toAddressValidated?: string;
  error?: string;
  warning?: string;
  resolvedAddress?: string;
  protocol?: string;
}

const VALIDATION_DEBOUNCE_MS = 500;

export const useToAddressValidation = () => {
  const { asset, chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType, isBitcoinSendType, isTronSendType } =
    useSendType();
  const { validateName } = useNameValidation();
  const [result, setResult] = useState<ValidationResult>({});
  const prevAddressValidated = useRef<string>();
  const prevChainIdValidated = useRef<string>();
  const unmountedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateToAddressRef =
    useRef<
      (toAddress: string, signal?: AbortSignal) => Promise<ValidationResult>
    >();

  useEffect(
    () => () => {
      unmountedRef.current = true;
      abortControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    validateToAddressRef.current = async (
      toAddress: string,
      signal?: AbortSignal,
    ): Promise<ValidationResult> => {
      if (!toAddress || !chainId) {
        return {};
      }

      if (signal?.aborted) {
        return {};
      }

      if (
        isEvmSendType &&
        isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })
      ) {
        return await validateHexAddress(
          toAddress,
          chainId as Hex,
          asset?.address,
        );
      }

      if (isSolanaSendType && isSolanaAddress(toAddress)) {
        return validateSolanaAddress(toAddress);
      }

      if (isBitcoinSendType && isBtcMainnetAddress(toAddress)) {
        return validateBitcoinAddress(toAddress);
      }

      if (isTronSendType) {
        return validateTronAddress(toAddress);
      }

      if (isResolvableName(toAddress)) {
        return await validateName(chainId, toAddress, signal);
      }

      return {
        error: strings('send.invalid_address'),
      };
    };
  }, [
    asset,
    chainId,
    isEvmSendType,
    isSolanaSendType,
    isBitcoinSendType,
    isTronSendType,
    validateName,
  ]);

  const debouncedValidateToAddress = useMemo(
    () =>
      debounce(async (toAddress: string, validationChainId: string) => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        const validationResult = await validateToAddressRef.current?.(
          toAddress,
          abortControllerRef.current.signal,
        );

        if (
          !unmountedRef.current &&
          prevAddressValidated.current === toAddress &&
          prevChainIdValidated.current === validationChainId
        ) {
          setResult({
            ...validationResult,
            toAddressValidated: toAddress,
          });
        }
      }, VALIDATION_DEBOUNCE_MS),
    [],
  );

  useEffect(() => {
    const addressUnchanged = prevAddressValidated.current === to;
    const chainIdUnchanged = prevChainIdValidated.current === chainId;

    if (!to || !chainId || (addressUnchanged && chainIdUnchanged)) {
      return;
    }

    prevAddressValidated.current = to;
    prevChainIdValidated.current = chainId;
    debouncedValidateToAddress(to, chainId);
  }, [to, chainId, debouncedValidateToAddress]);

  useEffect(
    () => () => {
      debouncedValidateToAddress.cancel();
    },
    [debouncedValidateToAddress],
  );

  const {
    toAddressValidated,
    error: toAddressError,
    warning: toAddressWarning,
    resolvedAddress,
    protocol: resolutionProtocol,
  } = result ?? {};

  return {
    resolvedAddress,
    toAddressError,
    toAddressValidated,
    toAddressWarning,
    resolutionProtocol,
  };
};
