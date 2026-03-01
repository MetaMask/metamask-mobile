import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  TokenApprovalsState,
  ApprovalItem,
  VerdictFilter,
  SortOption,
  RevocationStatus,
} from '../../../../components/UI/TokenApprovals/types';

export type { TokenApprovalsState };

export const initialState: TokenApprovalsState = {
  approvals: [],
  isLoading: false,
  error: null,
  chainErrors: {},
  selectedChains: [],
  verdictFilter: 'All',
  sortBy: 'risk',
  searchQuery: '',
  selectedApprovalIds: [],
  isSelectionModeActive: false,
  revocations: {},
  hasSeenEducation: false,
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    tokenApprovals?: TokenApprovalsState;
  };
}

const tokenApprovalsSlice = createSlice({
  name: 'tokenApprovals',
  initialState,
  reducers: {
    setApprovals: (state, action: PayloadAction<ApprovalItem[]>) => {
      state.approvals = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setChainErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.chainErrors = action.payload;
    },
    setSelectedChains: (state, action: PayloadAction<string[]>) => {
      state.selectedChains = action.payload;
    },
    setVerdictFilter: (state, action: PayloadAction<VerdictFilter>) => {
      state.verdictFilter = action.payload;
    },
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.sortBy = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    toggleApprovalSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.selectedApprovalIds.indexOf(id);
      if (index >= 0) {
        state.selectedApprovalIds.splice(index, 1);
      } else {
        state.selectedApprovalIds.push(id);
      }
    },
    selectAllApprovals: (state, action: PayloadAction<string[]>) => {
      state.selectedApprovalIds = action.payload;
    },
    clearSelection: (state) => {
      state.selectedApprovalIds = [];
      state.isSelectionModeActive = false;
    },
    enterSelectionMode: (state) => {
      state.isSelectionModeActive = true;
    },
    exitSelectionMode: (state) => {
      state.isSelectionModeActive = false;
      state.selectedApprovalIds = [];
    },
    setRevocationStatus: (
      state,
      action: PayloadAction<{ id: string; status: RevocationStatus }>,
    ) => {
      state.revocations[action.payload.id] = action.payload.status;
    },
    removeApproval: (state, action: PayloadAction<string>) => {
      state.approvals = state.approvals.filter((a) => a.id !== action.payload);
      state.selectedApprovalIds = state.selectedApprovalIds.filter(
        (id) => id !== action.payload,
      );
      delete state.revocations[action.payload];
    },
    setHasSeenEducation: (state, action: PayloadAction<boolean>) => {
      state.hasSeenEducation = action.payload;
    },
    resetTokenApprovals: (state) => {
      Object.assign(state, {
        ...initialState,
        hasSeenEducation: state.hasSeenEducation,
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.tokenApprovals) {
        return {
          ...initialState,
          hasSeenEducation:
            action.payload.tokenApprovals.hasSeenEducation ?? false,
        };
      }
      return state;
    });
  },
});

export const {
  setApprovals,
  setLoading,
  setError,
  setChainErrors,
  setSelectedChains,
  setVerdictFilter,
  setSortBy,
  setSearchQuery,
  toggleApprovalSelection,
  selectAllApprovals,
  clearSelection,
  enterSelectionMode,
  exitSelectionMode,
  setRevocationStatus,
  removeApproval,
  setHasSeenEducation,
  resetTokenApprovals,
} = tokenApprovalsSlice.actions;

export default tokenApprovalsSlice.reducer;
