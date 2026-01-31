import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useCallback } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isResolvableName } from '../../../../../util/address';
import { useSnapNameResolution } from '../../../../Snaps/hooks/useSnapNameResolution';
import { getConfusableCharacterInfo } from '../../utils/send-address-validations';
import { useSendFlowEnsResolutions } from './useSendFlowEnsResolutions';
import { useSendType } from './useSendType';

const MULTICHAIN_BURN_ZERO_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x0',
  '0x',
  '11111111111111111111111111111111',
  '1nc1nerator11111111111111111111111111111111',
  'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
];

function isBurnOrZeroAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  const normalizedAddress = address.toLowerCase();
  return MULTICHAIN_BURN_ZERO_ADDRESSES.some(
    (burnAddress) => burnAddress.toLowerCase() === normalizedAddress,
  );
}

export const useNameValidation = () => {
  const { fetchResolutions } = useSnapNameResolution();
  const { setResolvedAddress } = useSendFlowEnsResolutions();
  const { isEvmSendType } = useSendType();

  const validateName = useCallback(
    async (chainId: string, to: string, signal?: AbortSignal) => {
      if (!isResolvableName(to)) {
        return {
          error: strings('send.could_not_resolve_name'),
        };
      }

      if (signal?.aborted) {
        return {};
      }

      const resolutions = await fetchResolutions(
        formatChainIdToCaip(chainId),
        to,
        signal,
      );

      if (signal?.aborted) {
        return {};
      }

      if (resolutions.length === 0) {
        return {
          error: strings('send.could_not_resolve_name'),
        };
      }

      const resolvedAddress = resolutions[0]?.resolvedAddress;

      if (isBurnOrZeroAddress(resolvedAddress)) {
        return {
          error: strings('send.name_resolution_zero_address_error'),
        };
      }

      if (resolvedAddress && isEvmSendType) {
        setResolvedAddress(chainId, to, resolvedAddress);
      }

      return {
        resolvedAddress,
        protocol: resolutions[0]?.protocol,
        ...getConfusableCharacterInfo(to),
      };
    },
    [fetchResolutions, isEvmSendType, setResolvedAddress],
  );

  return {
    validateName,
  };
};
