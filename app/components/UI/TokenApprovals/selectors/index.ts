import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { ApprovalItem, Verdict } from '../types';
import { VERDICT_PRIORITY } from '../constants/approvals';
import { CHAIN_DISPLAY_NAMES } from '../constants/chains';

const selectTokenApprovalsState = (state: RootState) => state.tokenApprovals;

export const selectApprovals = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.approvals,
);

export const selectIsLoading = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.isLoading,
);

export const selectError = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.error,
);

export const selectChainErrors = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.chainErrors,
);

export const selectSelectedChains = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.selectedChains,
);

export const selectVerdictFilter = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.verdictFilter,
);

export const selectSortBy = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.sortBy,
);

export const selectSearchQuery = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.searchQuery,
);

export const selectSelectedApprovalIds = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.selectedApprovalIds,
);

export const selectIsSelectionModeActive = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.isSelectionModeActive,
);

export const selectRevocations = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.revocations,
);

export const selectHasSeenEducation = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.hasSeenEducation,
);

export const selectFilteredApprovals = createSelector(
  [
    selectApprovals,
    selectSelectedChains,
    selectVerdictFilter,
    selectSortBy,
    selectSearchQuery,
  ],
  (approvals, selectedChains, verdictFilter, sortBy, searchQuery) => {
    let filtered = [...approvals];

    // Chain filter
    if (selectedChains.length > 0) {
      filtered = filtered.filter((a) => selectedChains.includes(a.chainId));
    }

    // Verdict filter
    if (verdictFilter !== 'All') {
      filtered = filtered.filter((a) => a.verdict === verdictFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.asset.symbol.toLowerCase().includes(query) ||
          a.asset.name.toLowerCase().includes(query) ||
          a.spender.address.toLowerCase().includes(query) ||
          (a.spender.label?.toLowerCase().includes(query) ?? false),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return (
            VERDICT_PRIORITY[a.verdict] - VERDICT_PRIORITY[b.verdict] ||
            b.exposure_usd - a.exposure_usd
          );
        case 'value':
          return b.exposure_usd - a.exposure_usd;
        case 'asset_name':
          return a.asset.symbol.localeCompare(b.asset.symbol);
        default:
          return 0;
      }
    });

    return filtered;
  },
);

export const selectMaliciousApprovals = createSelector(
  selectApprovals,
  (approvals) => approvals.filter((a) => a.verdict === Verdict.Malicious),
);

export const selectMaliciousCount = createSelector(
  selectMaliciousApprovals,
  (malicious) => malicious.length,
);

export const selectMaliciousExposureUsd = createSelector(
  selectMaliciousApprovals,
  (malicious) => malicious.reduce((sum, a) => sum + a.exposure_usd, 0),
);

export const selectAvailableChains = createSelector(
  selectApprovals,
  (approvals) => {
    const chainIds = [...new Set(approvals.map((a) => a.chainId))];
    return chainIds.map((chainId) => ({
      chainId,
      displayName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
      count: approvals.filter((a) => a.chainId === chainId).length,
    }));
  },
);

export const selectRevocationSession = createSelector(
  selectTokenApprovalsState,
  (tokenApprovals) => tokenApprovals.revocationSession,
);

export const selectGroupedByVerdict = createSelector(
  selectFilteredApprovals,
  (approvals) => {
    const groups: Record<Verdict, ApprovalItem[]> = {
      [Verdict.Malicious]: [],
      [Verdict.Warning]: [],
      [Verdict.Benign]: [],
      [Verdict.Error]: [],
    };

    for (const approval of approvals) {
      groups[approval.verdict].push(approval);
    }

    return groups;
  },
);
