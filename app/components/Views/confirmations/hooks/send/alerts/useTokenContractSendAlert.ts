import { Hex } from '@metamask/utils';
import { useEffect, useState } from 'react';

import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import {
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../../../util/address';
import { memoizedGetTokenStandardAndDetails } from '../../../utils/token';
import { useSendContext } from '../../../context/send-context/send-context';
import { useSendType } from '../useSendType';
import type { SendAlert } from './types';

export function useTokenContractSendAlert(): {
  alert: SendAlert | null;
  isPending: boolean;
} {
  const { to, chainId, asset } = useSendContext();
  const { isEvmSendType } = useSendType();
  const [isTokenContract, setIsTokenContract] = useState(false);
  const [checkComplete, setCheckComplete] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsTokenContract(false);

    if (!to || !chainId || !isEvmSendType || !isValidHexAddress(to)) {
      setCheckComplete(true);
      return undefined;
    }

    if (to?.toLowerCase() === asset?.address?.toLowerCase()) {
      setCheckComplete(true);
      return undefined;
    }

    setCheckComplete(false);

    const checksummedAddress = toChecksumAddress(to);
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as Hex,
    );

    memoizedGetTokenStandardAndDetails({
      tokenAddress: checksummedAddress,
      tokenId: undefined,
      userAddress: undefined,
      networkClientId,
    })
      .then((token) => {
        if (!cancelled && token?.standard) {
          setIsTokenContract(true);
        }
      })
      .catch(() => {
        // Not a token address
      })
      .finally(() => {
        if (!cancelled) {
          setCheckComplete(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [to, chainId, isEvmSendType, asset?.address]);

  const isPending = !checkComplete;

  if (!isTokenContract) {
    return { alert: null, isPending };
  }

  return {
    alert: {
      key: 'tokenContract',
      title: strings('send.smart_contract_address'),
      message: strings('send.smart_contract_address_warning'),
    },
    isPending: false,
  };
}
