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
  // Updated to accept chainId as a parameter
  // const chainId = useSelector(selectChainId); // Removed the useSelector hook

  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export default useStakingChain;
