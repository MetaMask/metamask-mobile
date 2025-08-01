import { Hex } from '@metamask/utils';
import { useMemo } from 'react';

import Engine from '../../../../../core/Engine';
import { useSendContext } from '../../context/send-context';
import { useGasFeeEstimates } from '../gas/useGasFeeEstimates';
import { useSendType } from './useSendType';

export const useGasFeeEstimatesForSend = () => {
  const { chainId } = useSendContext();
  const { isNonEvmSendType } = useSendType();

  const { NetworkController } = Engine.context;

  const networkClientId = useMemo(
    () => {
      if (isNonEvmSendType || !chainId) {
        return undefined;
      }
      return NetworkController.findNetworkClientIdByChainId(chainId as Hex);
    },
    [chainId, isNonEvmSendType], // eslint-disable-line react-hooks/exhaustive-deps,
  );

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId ?? '');

  return { gasFeeEstimates };
};
