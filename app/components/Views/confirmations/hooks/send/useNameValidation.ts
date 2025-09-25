import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useCallback } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isENS } from '../../../../../util/address';
import { useSnapNameResolution } from '../../../../Snaps/hooks/useSnapNameResolution';
import { getConfusableCharacterInfo } from '../../utils/send-address-validations';

export const useNameValidation = () => {
  const { fetchResolutions } = useSnapNameResolution();

  const validateName = useCallback(
    async (chainId: string, to: string) => {
      if (isENS(to)) {
        const resolutions = await fetchResolutions(
          formatChainIdToCaip(chainId),
          to,
        );

        if (!resolutions) {
          return {
            toAddressValidated: to,
            error: strings('send.could_not_resolve_name'),
          };
        }
        const resolvedAddress = resolutions[0]?.resolvedAddress;

        return {
          resolvedAddress,
          ...getConfusableCharacterInfo(to),
          toAddressValidated: to,
        };
      }

      return {
        error: strings('send.could_not_resolve_name'),
        toAddressValidated: to,
      };
    },
    [fetchResolutions],
  );

  return {
    validateName,
  };
};
