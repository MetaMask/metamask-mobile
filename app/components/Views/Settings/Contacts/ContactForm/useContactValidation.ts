import { useCallback, useEffect, useRef } from 'react';
import type { AddressBookControllerState } from '@metamask/address-book-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { Hex } from '@metamask/utils';
import { validateAddressOrENS } from '../../../../../util/address';

export type ValidationResult = Awaited<ReturnType<typeof validateAddressOrENS>>;

interface UseContactValidationOptions {
  addressBook: AddressBookControllerState['addressBook'];
  chainId: Hex;
  contactChainId: Hex | '';
  internalAccounts: InternalAccount[];
  onResult: (result: ValidationResult, address: string) => void;
}

export const useContactValidation = ({
  addressBook,
  chainId,
  contactChainId,
  internalAccounts,
  onResult,
}: UseContactValidationOptions) => {
  const contextRef = useRef({
    addressBook,
    chainId,
    contactChainId,
    internalAccounts,
  });
  const onResultRef = useRef(onResult);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    contextRef.current = {
      addressBook,
      chainId,
      contactChainId,
      internalAccounts,
    };
    onResultRef.current = onResult;
  }, [addressBook, chainId, contactChainId, internalAccounts, onResult]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return useCallback((address: string) => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const currentContext = contextRef.current;
      const result = await validateAddressOrENS(
        address,
        currentContext.addressBook,
        currentContext.internalAccounts,
        currentContext.contactChainId || currentContext.chainId,
      );

      if (requestId === requestIdRef.current) {
        onResultRef.current(result, address);
      }
    }, 300);
  }, []);
};
