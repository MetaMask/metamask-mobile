import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import { selectDefaultEndpointByChainId } from '../../../../../selectors/networkController';
import { useSendContext } from '../../context/send-context';
import { useGasFeeEstimates } from '../gas/useGasFeeEstimates';
import { useSendType } from './useSendType';

export const useGasFeeEstimatesForSend = () => {
  const { chainId } = useSendContext();
  const { isNonEvmSendType } = useSendType();

  const defaultEndpointNetworkClientId = useSelector(
    (state: RootState) =>
      selectDefaultEndpointByChainId(state, chainId as Hex)?.networkClientId,
  );

  const networkClientId =
    isNonEvmSendType || !chainId ? undefined : defaultEndpointNetworkClientId;

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId ?? '');

  return { gasFeeEstimates, networkClientId };
};
