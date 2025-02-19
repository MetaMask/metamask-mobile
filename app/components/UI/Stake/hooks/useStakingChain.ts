import { CaipChainId, Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { getDecimalChainId } from '../../../../util/networks';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { isSupportedChain } from '@metamask/stake-sdk';

const useStakingChain = () => {
  const chainId = useSelector(selectEvmChainId);

  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export const useStakingChainByChainId = (chainId: Hex | CaipChainId) => {
  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export default useStakingChain;
