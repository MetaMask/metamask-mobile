import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { getDecimalChainId } from '../../../../util/networks';
import { selectChainId } from '../../../../selectors/networkController';
import { isSupportedChain } from '@metamask/stake-sdk';

const useStakingChain = () => {
  const chainId = useSelector(selectChainId);

  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export const useStakingChainByChainId = (chainId: Hex) => {
  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export default useStakingChain;
