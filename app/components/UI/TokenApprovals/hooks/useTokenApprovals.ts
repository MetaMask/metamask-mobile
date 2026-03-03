import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setApprovals,
  setLoading,
  setError,
  setChainErrors,
  resetTokenApprovals,
} from '../../../../core/redux/slices/tokenApprovals';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { fetchAllApprovals } from '../api/fetchApprovals';
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
  const address = useSelector(selectSelectedInternalAccountAddress);
  const approvals = useSelector(selectApprovals);
  const filteredApprovals = useSelector(selectFilteredApprovals);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const chainErrors = useSelector(selectChainErrors);
  const maliciousCount = useSelector(selectMaliciousCount);
  const maliciousExposureUsd = useSelector(selectMaliciousExposureUsd);
  const availableChains = useSelector(selectAvailableChains);

  const loadApprovals = useCallback(async () => {
    if (!address) {
      dispatch(setError('No account address available'));
      return;
    }

    dispatch(resetTokenApprovals());
    dispatch(setLoading(true));

    try {
      const result = await fetchAllApprovals(address);
      dispatch(setApprovals(result.approvals));
      dispatch(setChainErrors(result.chainErrors));
    } catch (err) {
      dispatch(
        setError(
          err instanceof Error ? err.message : 'Failed to load approvals',
        ),
      );
    }
  }, [dispatch, address]);

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
