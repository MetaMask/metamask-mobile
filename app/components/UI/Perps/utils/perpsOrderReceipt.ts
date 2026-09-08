// Retain development-only UI submission receipts across navigation, without exposing mutation methods.
import type { OrderParams, OrderResult } from '@metamask/perps-controller';

export interface PerpsOrderReceiptIdentity {
  approvalId: string;
  transactionTime: number;
  account: string;
  provider: string;
  isTestnet: boolean;
  chainId: string;
  routeKey: string;
}

export interface PerpsOrderReceipt {
  id: string;
  identity: PerpsOrderReceiptIdentity;
  request: {
    asset: string;
    direction: 'long' | 'short';
    amount: string;
    leverage: number;
    orderType: string;
    limitPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
  };
  status: 'pending' | 'settled';
  submittedRequest?: OrderParams;
  result?: OrderResult;
  protectionResult?: OrderResult;
}

const receipts = new Map<string, PerpsOrderReceipt>();
let sequence = 0;

export function beginPerpsOrderReceipt(
  identity: PerpsOrderReceiptIdentity | undefined,
  request: PerpsOrderReceipt['request'],
): string | undefined {
  if (!__DEV__ || !identity) return undefined;
  const id = `${identity.approvalId}:${++sequence}`;
  receipts.set(
    id,
    JSON.parse(JSON.stringify({ id, identity, request, status: 'pending' })),
  );
  if (receipts.size > 32)
    receipts.delete(receipts.keys().next().value as string);
  return id;
}

export function settlePerpsOrderReceipt(
  id: string | undefined,
  submittedRequest: OrderParams,
  result: OrderResult,
) {
  const receipt = id ? receipts.get(id) : undefined;
  if (!receipt || receipt.status !== 'pending') return;
  receipts.set(
    receipt.id,
    JSON.parse(
      JSON.stringify({
        ...receipt,
        submittedRequest,
        result,
        status: 'settled',
      }),
    ),
  );
}

export function recordPerpsOrderProtectionResult(
  id: string | undefined,
  result: OrderResult,
) {
  const receipt = id ? receipts.get(id) : undefined;
  if (receipt) receipt.protectionResult = JSON.parse(JSON.stringify(result));
}

export function readPerpsOrderReceipts(
  approvalId: string,
): PerpsOrderReceipt[] {
  if (!__DEV__) return [];
  return JSON.parse(
    JSON.stringify(
      [...receipts.values()].filter(
        (receipt) => receipt.identity.approvalId === approvalId,
      ),
    ),
  );
}
