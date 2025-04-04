/**
 * The contents of this file have been taken verbatim from
 * metamask-extension/shared/constants/signatures.ts
 *
 * If updating, please be mindful of this or delete this comment.
 */

export enum PrimaryTypeOrder {
  Order = 'Order',
  OrderComponents = 'OrderComponents',
}

export enum PrimaryTypePermit {
  Permit = 'Permit',
  PermitBatch = 'PermitBatch',
  PermitBatchTransferFrom = 'PermitBatchTransferFrom',
  PermitSingle = 'PermitSingle',
  PermitTransferFrom = 'PermitTransferFrom',
}

/**
 * EIP-712 Permit PrimaryTypes
 */
export const PrimaryType = {
  ...PrimaryTypeOrder,
  ...PrimaryTypePermit,
} as const;

// Create a type from the const object
export type PrimaryType = (typeof PrimaryType)[keyof typeof PrimaryType];

export const PRIMARY_TYPES_ORDER: PrimaryTypeOrder[] =
  Object.values(PrimaryTypeOrder);
export const PRIMARY_TYPES_PERMIT: PrimaryTypePermit[] =
  Object.values(PrimaryTypePermit);
export const PRIMARY_TYPES: PrimaryType[] = Object.values(PrimaryType);

export enum ResultType {
  Benign = 'Benign',
  Malicious = 'Malicious',
  Warning = 'Warning',

  // MetaMask defined result types
  Failed = 'Failed',
  RequestInProgress = 'RequestInProgress',
}
