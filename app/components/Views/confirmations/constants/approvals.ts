export const SIGNATURE_LEGACY = 'function approve(address,uint256)';

export const SIGNATURE_PERMIT2 =
  'function approve(address,address,uint160,uint48)';

export const SIGNATURE_INCREASE_ALLOWANCE =
  'function increaseAllowance(address,uint256)';

export const APPROVAL_TYPES = {
  approve: 'approve',
  increaseAllowance: 'increaseAllowance',
  setApprovalForAll: 'setApprovalForAll',
};

export const APPROVALS_LIST = [
  APPROVAL_TYPES.approve,
  APPROVAL_TYPES.increaseAllowance,
  APPROVAL_TYPES.setApprovalForAll,
];
