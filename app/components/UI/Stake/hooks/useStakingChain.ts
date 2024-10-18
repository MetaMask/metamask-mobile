import { useSelector } from 'react-redux';
import { getDecimalChainId } from '../../../../util/networks';
import { selectChainId } from '../../../../selectors/networkController';

const useStakingChain = () => {
  const chainId = useSelector(selectChainId);

  const isHoleskyByChainId =
    getDecimalChainId(String(chainId)) === String(17000);

  const isMainnetByChainId = getDecimalChainId(String(chainId)) === String(1);

  const isStakingSupportedChain = isMainnetByChainId || isHoleskyByChainId;

  return {
    isStakingSupportedChain,
  };
};

export default useStakingChain;
