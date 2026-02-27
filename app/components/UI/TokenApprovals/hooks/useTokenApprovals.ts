import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setApprovals,
  setLoading,
  setError,
  setChainErrors,
} from '../../../../core/redux/slices/tokenApprovals';
// TODO: Switch back to real API when done testing UI
// import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
// import { fetchAllApprovals } from '../api/fetchApprovals';
import { fetchMockApprovals } from '../api/mockApprovals';
import {
  selectApprovals,
  selectIsLoading,
  selectError,
  selectChainErrors,
  selectFilteredApprovals,
  selectMaliciousCount,
  selectMaliciousExposureUsd,
  selectAvailableChains,
} from '../selectors';

export function useTokenApprovals() {
  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const filteredApprovals = useSelector(selectFilteredApprovals);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const chainErrors = useSelector(selectChainErrors);
  const maliciousCount = useSelector(selectMaliciousCount);
  const maliciousExposureUsd = useSelector(selectMaliciousExposureUsd);
  const availableChains = useSelector(selectAvailableChains);

  const loadApprovals = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const result = await fetchMockApprovals();
      dispatch(setApprovals(result.approvals));
      dispatch(setChainErrors(result.chainErrors));
    } catch (err) {
      dispatch(
        setError(
          err instanceof Error ? err.message : 'Failed to load approvals',
        ),
      );
    }
  }, [dispatch]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  return {
    approvals,
    filteredApprovals,
    isLoading,
    error,
    chainErrors,
    maliciousCount,
    maliciousExposureUsd,
    availableChains,
    refresh: loadApprovals,
  };
}
