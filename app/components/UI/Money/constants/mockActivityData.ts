import { Transaction, TransactionType } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

export type MoneyActivityFilterType = 'deposit' | 'transfer';

export enum MoneyActivityFilter {
  All = 'all',
  Deposits = 'deposits',
  Transfers = 'transfers',
}

export interface MoneyMockTransaction {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  description?: string;
  date: string;
  filter: MoneyActivityFilterType;
}

const MUSD_ASSET_TYPE = 'eip155:1/erc20:0xmusd' as const;
const MOCK_ACCOUNT = '00000000-0000-0000-0000-000000000001';
const MOCK_CHAIN = 'eip155:1' as const;

const makeMusdAsset = (amount: string) => ({
  unit: 'mUSD',
  type: MUSD_ASSET_TYPE as `${string}:${string}/${string}:${string}`,
  amount,
  fungible: true as const,
});

const MOCK_MONEY_TRANSACTIONS: MoneyMockTransaction[] = [
  {
    transaction: {
      id: 'money-tx-1',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1747094400,
      type: TransactionType.Receive,
      from: [
        {
          address: '0x0000000000000000000000000000000000000000',
          asset: makeMusdAsset('100.00'),
        },
      ],
      to: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('100.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: undefined,
    date: '2026-05-10',
    filter: 'deposit',
  },
  {
    transaction: {
      id: 'money-tx-2',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1747090800,
      type: TransactionType.Receive,
      from: [
        {
          address: '0xTransakBridge0000000000000000000000000000',
          asset: makeMusdAsset('1000.00'),
        },
      ],
      to: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('1000.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: 'Transak',
    date: '2026-05-10',
    filter: 'deposit',
  },
  {
    transaction: {
      id: 'money-tx-3',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1747087200,
      type: TransactionType.Receive,
      from: [
        {
          address: '0x2323100000000000000000000000000000012345',
          asset: makeMusdAsset('500.00'),
        },
      ],
      to: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('500.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: 'From: 0x23231...12345',
    date: '2026-05-10',
    filter: 'deposit',
  },
  {
    transaction: {
      id: 'money-tx-4',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1747083600,
      type: TransactionType.Send,
      from: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('10.00'),
        },
      ],
      to: [
        {
          address: '0xMerchant000000000000000000000000000000000',
          asset: makeMusdAsset('10.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: undefined,
    date: '2026-05-10',
    filter: 'transfer',
  },
  {
    transaction: {
      id: 'money-tx-5',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1746921600,
      type: TransactionType.Swap,
      from: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: {
            unit: 'USDC',
            type: 'eip155:1/erc20:0xusdc' as `${string}:${string}/${string}:${string}`,
            amount: '300.00',
            fungible: true as const,
          },
        },
      ],
      to: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('300.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: 'USDC → mUSD',
    date: '2026-05-08',
    filter: 'deposit',
  },
  {
    transaction: {
      id: 'money-tx-6',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1746918000,
      type: TransactionType.Send,
      from: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('250.00'),
        },
      ],
      to: [
        {
          address: '0x2222222222222222222222222222222222222222',
          asset: {
            unit: 'ETH',
            type: 'eip155:1/slip44:60' as `${string}:${string}/${string}:${string}`,
            amount: '0.1',
            fungible: true as const,
          },
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: 'From mUSD → ETH',
    date: '2026-05-08',
    filter: 'transfer',
  },
  {
    transaction: {
      id: 'money-tx-7',
      chain: MOCK_CHAIN,
      account: MOCK_ACCOUNT,
      status: 'confirmed',
      timestamp: 1746914400,
      type: TransactionType.Receive,
      from: [
        {
          address: '0x3333333333333333333333333333333333333333',
          asset: makeMusdAsset('200.00'),
        },
      ],
      to: [
        {
          address: '0x1111111111111111111111111111111111111111',
          asset: makeMusdAsset('200.00'),
        },
      ],
      fees: [],
      events: [],
    },
    chainId: MOCK_CHAIN as unknown as SupportedCaipChainId,
    description: 'From: 0x33333...33333',
    date: '2026-05-08',
    filter: 'deposit',
  },
];

export default MOCK_MONEY_TRANSACTIONS;
