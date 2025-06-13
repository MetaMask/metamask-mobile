import { CaipChainId, Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { getDecimalChainId } from '../../../../util/networks';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { isSupportedPooledStakingChain } from '@metamask/earn-controller';

const useStakingChain = () => {
  const chainId = useSelector(selectEvmChainId);

  const isStakingSupportedChain = isSupportedPooledStakingChain(
    getDecimalChainId(chainId),
  );

  return {
    isStakingSupportedChain,
  };
};

export const useStakingChainByChainId = (chainId: Hex | CaipChainId) => {
  const isStakingSupportedChain = isSupportedPooledStakingChain(
    getDecimalChainId(chainId),
  );

  return {
    isStakingSupportedChain,
  };
};

export default useStakingChain;
