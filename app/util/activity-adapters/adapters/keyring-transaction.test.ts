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
        data: {
          hash: 'send-id',
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
        data: {
          hash: 'swap-id',
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
        data: {
          hash: 'btc-send-output-id',
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

  it('maps trustline approve transactions to trustlineActivate activity items', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'trustline-add-id',
        chain: 'stellar:pubnet',
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.TokenApprove,
        from: [
          {
            address: 'GABC123',
            asset: {
              fungible: true,
              type: 'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
              unit: 'USDC',
              amount: '0',
            },
          },
        ],
        to: [{ address: 'GABC123', asset: null }],
        fees: [],
        events: [],
        details: {
          typeLabel: 'trustline-approve',
        },
      } as Transaction,
    });

    expect(item).toStrictEqual(
      expect.objectContaining({
        type: 'trustlineActivate',
        data: {
          hash: 'trustline-add-id',
          from: 'GABC123',
          to: 'GABC123',
          token: {
            amount: '0',
            assetId:
              'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
            direction: 'out',
            symbol: 'USDC',
          },
        },
      }),
    );
  });

  it('maps trustline disapprove transactions to trustlineDeactivate activity items', () => {
    const item = mapKeyringTransaction({
      transaction: {
        id: 'trustline-remove-id',
        chain: 'stellar:pubnet',
        account: '00000000-0000-4000-8000-000000000000',
        status: TransactionStatus.Confirmed,
        timestamp: 1716367781,
        type: TransactionType.TokenDisapprove,
        from: [
          {
            address: 'GABC123',
            asset: {
              fungible: true,
              type: 'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
              unit: 'USDC',
              amount: '0',
            },
          },
        ],
        to: [{ address: 'GABC123', asset: null }],
        fees: [],
        events: [],
        details: {
          typeLabel: 'trustline-disapprove',
        },
      } as Transaction,
    });

    expect(item).toMatchObject({
      type: 'trustlineDeactivate',
      data: {
        hash: 'trustline-remove-id',
        token: {
          symbol: 'USDC',
          direction: 'out',
        },
      },
    });
  });
});
