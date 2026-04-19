/**
 * Asset being requested in a merchant payment QR code.
 *
 * `native` uses the EIP-681 `value` parameter; `erc20` uses the
 * `/transfer?address=<token>&uint256=<amount>` form.
 */
export type PaymentAsset =
  | { type: 'native' }
  | { type: 'erc20'; address: string };

/**
 * Optional MetaMask-specific metadata attached as extra URL query params on
 * the EIP-681 URI. Other wallets ignore unknown params; ours surfaces them
 * on the customer-side confirmation screen.
 */
export interface PaymentMetadata {
  /** Human-readable merchant display name. */
  merchantName?: string;
  /** Free-text note (e.g. "Order #123"). */
  memo?: string;
  /** Opaque merchant reconciliation id. */
  invoiceId?: string;
  /** ISO-8601 timestamp of issuance (audit only, not enforced). */
  issuedAt?: string;
}

export interface BuildPaymentUriParams {
  /** EVM chain id as a decimal string (e.g. '1'). */
  chainId: string;
  /** Merchant receive address (checksummed or lowercase). */
  merchantAddress: string;
  /** Atomic token amount (wei for native, token-decimals for ERC-20). */
  amount: string;
  asset: PaymentAsset;
  metadata?: PaymentMetadata;
}

export interface ParsedPaymentUri {
  chainId: string;
  merchantAddress: string;
  amount: string;
  asset: PaymentAsset;
  metadata: PaymentMetadata;
}

/** Keys used to carry merchant metadata in the EIP-681 query string. */
export const PAYMENT_METADATA_KEYS = [
  'merchantName',
  'memo',
  'invoiceId',
  'issuedAt',
] as const;

export type PaymentMetadataKey = (typeof PAYMENT_METADATA_KEYS)[number];
