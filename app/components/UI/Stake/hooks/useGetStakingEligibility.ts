import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { useGetPooledStakingEligibilityQuery } from '../slices/stakingApi';

const useGetStakingEligibility = () => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const queryResult = useGetPooledStakingEligibilityQuery(
    {
      addresses: selectedAddress ? [selectedAddress] : [],
    },
    { refetchOnMountOrArgChange: true },
  );

  const mostRecentFetchHasResolved =
    queryResult.isSuccess && !queryResult.isFetching;
  const resultIsConfirmed =
    mostRecentFetchHasResolved && queryResult.data !== undefined;

  return {
    isLoading: queryResult.isLoading,
    isConfirmedIneligible: resultIsConfirmed && !queryResult.data?.isEligible,
    isConfirmedEligible: resultIsConfirmed && queryResult.data?.isEligible,
    rawResult: queryResult,
  };
};

export default useGetStakingEligibility;
