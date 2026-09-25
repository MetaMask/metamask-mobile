import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { useSendContext } from '../../context/send-context';
import { useGasFeeEstimates } from '../gas/useGasFeeEstimates';
import { useSendType } from './useSendType';

export const useGasFeeEstimatesForSend = () => {
  const { chainId } = useSendContext();
  const { isNonEvmSendType } = useSendType();

  const { NetworkController } = Engine.context;
  useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );

  const networkClientId =
    isNonEvmSendType || !chainId
      ? undefined
      : NetworkController.findNetworkClientIdByChainId(chainId as Hex);

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId ?? '');

  return { gasFeeEstimates, networkClientId };
};
