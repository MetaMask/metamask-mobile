import type { V5TransactionRecord } from '@metamask/core-backend';
import {
  KnownCaipNamespace,
  toCaipAccountId,
  toCaipChainId,
} from '@metamask/utils';

const DEFAULT_ACCOUNT_ID = toCaipAccountId(
  KnownCaipNamespace.Eip155,
  '1',
  '0x0000000000000000000000000000000000000001',
);
const DEFAULT_CHAIN_ID = toCaipChainId(KnownCaipNamespace.Eip155, '1');

export const buildV5TransactionRecord = (
  overrides: {
    accountId?: V5TransactionRecord['accountId'];
    id?: string;
    chainId?: V5TransactionRecord['tx']['chainId'];
    status?: V5TransactionRecord['tx']['status'];
    timestamp?: number;
    date?: string;
    from?: string;
    to?: string | null;
    blockNumber?: string;
    blockHash?: string;
    value?: string;
    methodId?: string;
    transactionCategory?: string;
    valueTransfers?: V5TransactionRecord['valueTransfers'];
    fee?: V5TransactionRecord['fee'];
  } = {},
): V5TransactionRecord => ({
  accountId: overrides.accountId ?? DEFAULT_ACCOUNT_ID,
  tx: {
    id: overrides.id ?? '0xhash',
    chainId: overrides.chainId ?? DEFAULT_CHAIN_ID,
    status: overrides.status ?? 'confirmed',
    timestamp: overrides.timestamp ?? 1778593067000,
    date: overrides.date ?? '2026-05-13T14:34:23.000Z',
    from: overrides.from ?? '0x0000000000000000000000000000000000000001',
    to: overrides.to ?? '0x0000000000000000000000000000000000000002',
    blockNumber: overrides.blockNumber ?? '1',
    blockHash: overrides.blockHash ?? '0xblock',
    value: overrides.value ?? '0',
    ...(overrides.methodId !== undefined && { methodId: overrides.methodId }),
    ...(overrides.transactionCategory !== undefined && {
      transactionCategory: overrides.transactionCategory,
    }),
  },
  valueTransfers: overrides.valueTransfers ?? [],
  fee: overrides.fee ?? null,
});
