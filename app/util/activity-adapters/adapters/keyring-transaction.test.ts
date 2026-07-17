import { StatusTypes } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  TransactionStatus,
  TransactionType,
  type Transaction,
} from '@metamask/keyring-api';
import { mapKeyringTransaction } from './keyring-transaction';

const SOLANA_CHAIN_ID =
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as Transaction['chain'];
const BITCOIN_CHAIN_ID =
  'bip122:000000000019d6689c085ae165831e93' as Transaction['chain'];

describe('mapKeyringTransaction', () => {
  it('maps keyring send transactions with token amount data', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'send-id',
        chain: SOLANA_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.Send,
        from: [
          {
            address: 'from-address',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/token:usdc`,
              unit: 'USDC',
              amount: '2.5',
            },
          },
        ],
        to: [{ address: 'to-address', asset: null }],
        fees: [],
        events: [],
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'send',
        chainId: SOLANA_CHAIN_ID,
        status: 'success',
        timestamp: 1716367781000,
        hash: 'send-id',
        data: {
          from: 'from-address',
          to: 'to-address',
          token: {
            amount: '2.5',
            assetId: `${SOLANA_CHAIN_ID}/token:usdc`,
            direction: 'out',
            symbol: 'USDC',
          },
        },
      }),
    );
  });

  it('maps keyring swap transactions with source and destination token amounts', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'swap-id',
        chain: SOLANA_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Submitted,
        timestamp: 1716367781,
        type: TransactionType.Swap,
        from: [
          {
            address: 'from-address',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/slip44:501`,
              unit: 'SOL',
              amount: '1',
            },
          },
        ],
        to: [
          {
            address: 'to-address',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/token:usdc`,
              unit: 'USDC',
              amount: '100',
            },
          },
        ],
        fees: [],
        events: [],
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'swap',
        chainId: SOLANA_CHAIN_ID,
        status: 'pending',
        timestamp: 1716367781000,
        hash: 'swap-id',
        data: {
          sourceToken: {
            amount: '1',
            assetId: `${SOLANA_CHAIN_ID}/slip44:501`,
            direction: 'out',
            symbol: 'SOL',
          },
          destinationToken: {
            amount: '100',
            assetId: `${SOLANA_CHAIN_ID}/token:usdc`,
            direction: 'in',
            symbol: 'USDC',
          },
        },
      }),
    );
  });

  it('maps bitcoin send token from to-movement when from is empty', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'btc-send-output-id',
        chain: BITCOIN_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.Send,
        from: [{ address: 'bc1from', asset: null }],
        to: [
          {
            address: 'bc1to',
            asset: {
              fungible: true,
              type: `${BITCOIN_CHAIN_ID}/slip44:0`,
              unit: 'BTC',
              amount: '0.1',
            },
          },
        ],
        fees: [],
        events: [],
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'send',
        chainId: BITCOIN_CHAIN_ID,
        status: 'success',
        timestamp: 1716367781000,
        hash: 'btc-send-output-id',
        data: {
          from: 'bc1from',
          to: 'bc1to',
          token: {
            amount: '0.1',
            assetId: `${BITCOIN_CHAIN_ID}/slip44:0`,
            direction: 'out',
            symbol: 'BTC',
          },
        },
      }),
    );
  });

  it('maps token approvals as spending-cap activity with unlimited metadata', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'approve-id',
        chain: SOLANA_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.TokenApprove,
        from: [
          {
            address: 'owner-address',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/token:usdt`,
              unit: 'USDT',
              amount: '115792089237316195423570985.639935',
            },
          },
        ],
        to: [
          {
            address: 'spender-address',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/token:usdt`,
              unit: 'USDT',
              amount: '115792089237316195423570985.639935',
            },
          },
        ],
        fees: [],
        events: [],
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'approveSpendingCap',
        chainId: SOLANA_CHAIN_ID,
        status: 'success',
        timestamp: 1716367781000,
        hash: 'approve-id',
        data: {
          token: {
            amount: '115792089237316195423570985.639935',
            assetId: `${SOLANA_CHAIN_ID}/token:usdt`,
            direction: 'out',
            isUnlimitedApproval: true,
            symbol: 'USDT',
          },
        },
      }),
    );
  });

  it('maps keyring contract interaction fees', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'contract-id',
        chain: SOLANA_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.Unknown,
        from: [{ address: 'from-address', asset: null }],
        to: [{ address: 'to-address', asset: null }],
        fees: [
          {
            type: 'base',
            asset: {
              fungible: true,
              type: `${SOLANA_CHAIN_ID}/slip44:501`,
              unit: 'SOL',
              amount: '0.00001',
            },
          },
        ],
        events: [],
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'contractInteraction',
        data: expect.objectContaining({
          fees: [
            {
              type: 'base',
              amount: '0.00001',
              assetId: `${SOLANA_CHAIN_ID}/slip44:501`,
              symbol: 'SOL',
            },
          ],
        }),
      }),
    );
  });

  describe('bridge-history enrichment', () => {
    const EVM_CHAIN_ID = '0x1';

    const makeKeyringTx = (overrides: Partial<Transaction> = {}): Transaction =>
      ({
        id: 'bridge-id',
        chain: SOLANA_CHAIN_ID,
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.Send,
        from: [{ address: 'from-address', asset: null }],
        to: [],
        fees: [],
        events: [],
        ...overrides,
      }) as Transaction;

    const makeBridgeHistory = ({
      destChainId = EVM_CHAIN_ID,
      bridgeStatus = StatusTypes.PENDING,
      destChainAmount,
    }: {
      destChainId?: string | number;
      bridgeStatus?: StatusTypes;
      destChainAmount?: string;
    } = {}): BridgeHistoryItem =>
      ({
        quote: {
          srcChainId: SOLANA_CHAIN_ID,
          destChainId,
          srcAsset: {
            assetId: `${SOLANA_CHAIN_ID}/slip44:501`,
            decimals: 9,
            symbol: 'SOL',
          },
          srcTokenAmount: '1000000000',
          destAsset: {
            assetId: 'eip155:1/slip44:60',
            decimals: 18,
            symbol: 'ETH',
          },
          destTokenAmount: '5000000000000000',
        },
        status: {
          status: bridgeStatus,
          srcChain: { txHash: 'bridge-id' },
          ...(destChainAmount
            ? { destChain: { txHash: '0xdest', amount: destChainAmount } }
            : {}),
        },
      }) as unknown as BridgeHistoryItem;

    it('maps a cross-chain bridge to a pending bridge item with quote-derived tokens', () => {
      const item = mapKeyringTransaction({
        transaction: makeKeyringTx(),
        bridgeHistory: makeBridgeHistory(),
      });

      expect(item).toStrictEqual(
        expect.objectContaining({
          type: 'bridge',
          chainId: SOLANA_CHAIN_ID,
          // The confirmed source leg must not read as a completed bridge while
          // the destination leg is still in flight.
          status: 'pending',
          hash: 'bridge-id',
          data: {
            sourceToken: {
              amount: '1000000000',
              assetId: `${SOLANA_CHAIN_ID}/slip44:501`,
              decimals: 9,
              direction: 'out',
              symbol: 'SOL',
            },
            destinationToken: {
              amount: '5000000000000000',
              assetId: 'eip155:1/slip44:60',
              decimals: 18,
              direction: 'in',
              symbol: 'ETH',
            },
          },
        }),
      );
    });

    it('marks the bridge successful and prefers the received amount once the destination leg lands', () => {
      const item = mapKeyringTransaction({
        // Snaps report bridge sources through several keyring types; swap-typed
        // txs must enrich the same way send-typed ones do.
        transaction: makeKeyringTx({ type: TransactionType.Swap }),
        bridgeHistory: makeBridgeHistory({
          bridgeStatus: StatusTypes.COMPLETE,
          destChainAmount: '4990000000000000',
        }),
      });

      expect(item).toStrictEqual(
        expect.objectContaining({
          type: 'bridge',
          status: 'success',
          data: expect.objectContaining({
            destinationToken: expect.objectContaining({
              amount: '4990000000000000',
            }),
          }),
        }),
      );
    });

    it('maps a failed bridge status to a failed item', () => {
      const item = mapKeyringTransaction({
        transaction: makeKeyringTx(),
        bridgeHistory: makeBridgeHistory({ bridgeStatus: StatusTypes.FAILED }),
      });

      expect(item).toStrictEqual(
        expect.objectContaining({ type: 'bridge', status: 'failed' }),
      );
    });

    it('reads a failed source tx as failed before the bridge status catches up', () => {
      const item = mapKeyringTransaction({
        transaction: makeKeyringTx({ status: TransactionStatus.Failed }),
        bridgeHistory: makeBridgeHistory({ bridgeStatus: StatusTypes.PENDING }),
      });

      expect(item).toStrictEqual(
        expect.objectContaining({ type: 'bridge', status: 'failed' }),
      );
    });

    it('leaves same-chain swaps with bridge history on the regular keyring mapping', () => {
      const item = mapKeyringTransaction({
        transaction: makeKeyringTx({ type: TransactionType.Swap }),
        bridgeHistory: makeBridgeHistory({ destChainId: SOLANA_CHAIN_ID }),
      });

      expect(item).toStrictEqual(
        expect.objectContaining({ type: 'swap', status: 'success' }),
      );
    });
  });
});
