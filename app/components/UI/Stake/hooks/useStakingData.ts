import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import {
  useGetPooledStakesQuery,
  useGetVaultDataQuery,
} from '../slices/stakingApi';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';

const useStakingData = () => {
  const chainId = useSelector(selectChainId);

  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const { data: vaultData } = useGetVaultDataQuery({
    chainId: hexToNumber(chainId),
  });

  const stakesQueryResult = useGetPooledStakesQuery({
    chainId: hexToNumber(chainId),
    accounts: selectedAddress ? [selectedAddress] : [],
    resetCache: true,
  });

  const { accounts = [], exchangeRate = '' } = stakesQueryResult.data || {};
  const pooledStakesData = accounts[0] || undefined;

  return {
    vaultData,
    pooledStakesData,
    exchangeRate,
  };
};

export default useStakingData;
