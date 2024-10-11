import { useSelector } from 'react-redux';
import { selectChainId } from '../selectors/networkController';

export const useChainId = () => {
  // For now, just use the global chain ID from the selector
  const chainId = useSelector(selectChainId);

  // Future implementation could enhance this to support per-dapp chain ID
  return chainId;
};
