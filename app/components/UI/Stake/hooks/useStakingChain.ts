import { useSelector } from 'react-redux';
import { getDecimalChainId } from '../../../../util/networks';
import { selectChainId } from '../../../../selectors/networkController';
import { isSupportedChain } from '@metamask/stake-sdk';

const useIsStakingSupportedChain = () => {
  const chainId = useSelector(selectChainId);

  const isStakingSupportedChain = isSupportedChain(getDecimalChainId(chainId));

  return {
    isStakingSupportedChain,
  };
};

export default useIsStakingSupportedChain;
