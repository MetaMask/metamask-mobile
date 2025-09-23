import { AddressResolution } from '@metamask/snaps-sdk';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useCallback, useRef } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isENS } from '../../../../../util/address';
import { useSnapNameResolution } from '../../../../Snaps/hooks/useSnapNameResolution';
import { getConfusableCharacterInfo } from '../../utils/send-address-validations';
import { useSendContext } from '../../context/send-context';

export const useNameValidation = () => {
  const { chainId, to } = useSendContext();
  const { results, loading } = useSnapNameResolution({
    chainId: chainId ? formatChainIdToCaip(chainId) : '',
    domain: to ?? '',
  });
  const prevResolved = useRef<AddressResolution | undefined>();

  const validateName = useCallback(async () => {
    if (to && isENS(to)) {
      const resolvedAddress = results?.[0]?.resolvedAddress;
      if (loading) {
        if (prevResolved.current?.domainName === to) {
          return {
            resolvedAddress: prevResolved.current.resolvedAddress,
            ...getConfusableCharacterInfo(to),
            toAddressValidated: to,
          };
        }
        return { loading, toAddressValidated: to };
      }
      if (results?.length) {
        prevResolved.current = results?.[0];
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
    }
    return { toAddressValidated: to };
  }, [loading, results, to]);

  return {
    validateName,
  };
};
