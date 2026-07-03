import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { ControllerHookType } from '../controllerHook.types';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';

interface TokenBalances {
  [address: string]: string;
}

const useTokenBalancesController = (): ControllerHookType<TokenBalances> => {
  const tokenBalances = useSelector(selectContractBalances, isEqual);

  return { data: tokenBalances };
};

export default useTokenBalancesController;
export type { TokenBalances };
