import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useCallback } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isENS } from '../../../../../util/address';
import { useSnapNameResolution } from '../../../../Snaps/hooks/useSnapNameResolution';
import { getConfusableCharacterInfo } from '../../utils/send-address-validations';
import { useSendFlowEnsResolutions } from './useSendFlowEnsResolutions';
import { useSendType } from './useSendType';

export const useNameValidation = () => {
  const { fetchResolutions } = useSnapNameResolution();
  const { setResolvedAddress } = useSendFlowEnsResolutions();
  const { isEvmSendType } = useSendType();

  const validateName = useCallback(
    async (chainId: string, to: string) => {
      if (isENS(to)) {
        const resolutions = await fetchResolutions(
          formatChainIdToCaip(chainId),
          to,
        );

        if (resolutions.length === 0) {
          return {
            error: strings('send.could_not_resolve_name'),
          };
        }
        const resolvedAddress = resolutions[0]?.resolvedAddress;

        if (resolvedAddress && isEvmSendType) {
          // Set short living cache of ENS resolution for the given chain and address for confirmation screen
          setResolvedAddress(chainId, to, resolvedAddress);
        }

        return {
          resolvedAddress,
          ...getConfusableCharacterInfo(to),
        };
      }

      return {
        error: strings('send.could_not_resolve_name'),
      };
    },
    [fetchResolutions, isEvmSendType, setResolvedAddress],
  );

  return {
    validateName,
  };
};
