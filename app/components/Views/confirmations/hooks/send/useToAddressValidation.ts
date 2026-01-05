import { Hex } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useCallback, useEffect, useRef, useState } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isENS, isValidHexAddress } from '../../../../../util/address';
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
}

export const useToAddressValidation = () => {
  const { asset, chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType, isBitcoinSendType, isTronSendType } =
    useSendType();
  const { validateName } = useNameValidation();
  const [result, setResult] = useState<ValidationResult>({});
  const [loading, setLoading] = useState(false);
  const prevAddressValidated = useRef<string>();
  const unmountedRef = useRef(false);

  useEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  const validateToAddress = useCallback(
    async (toAddress?: string) => {
      if (!toAddress || !chainId) {
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

      if (isENS(toAddress)) {
        return await validateName(chainId, toAddress);
      }

      return {
        error: strings('send.invalid_address'),
      };
    },
    [
      asset,
      chainId,
      isEvmSendType,
      isSolanaSendType,
      isBitcoinSendType,
      isTronSendType,
      validateName,
    ],
  );

  useEffect(() => {
    if (prevAddressValidated.current === to) {
      return undefined;
    }

    (async () => {
      setLoading(true);
      prevAddressValidated.current = to;
      const validationResult = await validateToAddress(to);

      if (!unmountedRef.current && prevAddressValidated.current === to) {
        setResult({
          ...validationResult,
          toAddressValidated: to,
        });
      }
      setLoading(false);
    })();
  }, [setResult, to, validateToAddress]);

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
