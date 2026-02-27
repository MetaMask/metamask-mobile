import { Verdict, SortOption, VerdictFilter } from '../types';

export const VERDICT_PRIORITY: Record<Verdict, number> = {
  [Verdict.Malicious]: 0,
  [Verdict.Warning]: 1,
  [Verdict.Benign]: 2,
};

export const DEFAULT_SORT: SortOption = 'risk';
export const DEFAULT_VERDICT_FILTER: VerdictFilter = 'All';

export const ERC20_APPROVE_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
];

export const ERC721_SET_APPROVAL_FOR_ALL_ABI = [
  'function setApprovalForAll(address operator, bool approved)',
];

export const APPROVALS_API_ENDPOINT = 'v0/evm/address/approvals';
