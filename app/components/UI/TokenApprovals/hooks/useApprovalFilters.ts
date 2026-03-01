import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSelectedChains,
  setVerdictFilter,
  setSortBy,
  setSearchQuery,
  toggleApprovalSelection,
  selectAllApprovals,
  enterSelectionMode,
  exitSelectionMode,
} from '../../../../core/redux/slices/tokenApprovals';
import {
  selectSelectedChains,
  selectVerdictFilter,
  selectSortBy,
  selectSearchQuery,
  selectSelectedApprovalIds,
  selectIsSelectionModeActive,
  selectRevocations,
} from '../selectors';
import { VerdictFilter, SortOption } from '../types';

export function useApprovalFilters() {
  const dispatch = useDispatch();
  const selectedChains = useSelector(selectSelectedChains);
  const verdictFilter = useSelector(selectVerdictFilter);
  const sortBy = useSelector(selectSortBy);
  const searchQuery = useSelector(selectSearchQuery);
  const selectedApprovalIds = useSelector(selectSelectedApprovalIds);
  const isSelectionModeActive = useSelector(selectIsSelectionModeActive);
  const revocations = useSelector(selectRevocations);

  const handleChainToggle = useCallback(
    (chainId: string) => {
      const updated = selectedChains.includes(chainId)
        ? selectedChains.filter((id) => id !== chainId)
        : [...selectedChains, chainId];
      dispatch(setSelectedChains(updated));
    },
    [selectedChains, dispatch],
  );

  const handleVerdictFilterChange = useCallback(
    (filter: VerdictFilter) => {
      dispatch(setVerdictFilter(filter));
    },
    [dispatch],
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      dispatch(setSortBy(sort));
    },
    [dispatch],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch],
  );

  const handleToggleSelection = useCallback(
    (id: string) => {
      dispatch(toggleApprovalSelection(id));
    },
    [dispatch],
  );

  const handleSelectAll = useCallback(
    (ids: string[]) => {
      dispatch(selectAllApprovals(ids));
    },
    [dispatch],
  );

  const handleClearSelection = useCallback(() => {
    dispatch(exitSelectionMode());
  }, [dispatch]);

  const handleEnterSelectionMode = useCallback(() => {
    dispatch(enterSelectionMode());
  }, [dispatch]);

  const handleExitSelectionMode = useCallback(() => {
    dispatch(exitSelectionMode());
  }, [dispatch]);

  return {
    selectedChains,
    verdictFilter,
    sortBy,
    searchQuery,
    selectedApprovalIds,
    revocations,
    selectionMode: isSelectionModeActive || selectedApprovalIds.length > 0,
    onChainToggle: handleChainToggle,
    onVerdictFilterChange: handleVerdictFilterChange,
    onSortChange: handleSortChange,
    onSearchChange: handleSearchChange,
    onToggleSelection: handleToggleSelection,
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
    onEnterSelectionMode: handleEnterSelectionMode,
    onExitSelectionMode: handleExitSelectionMode,
  };
}
