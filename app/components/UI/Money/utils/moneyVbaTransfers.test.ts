import type { VbaTransfer } from '@metamask/money-account-api-data-service';
import { mapMoneyVbaTransfers } from './moneyVbaTransfers';

const WALLET = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const HASH = `0x${'a'.repeat(64)}`;

const transfer = (overrides: Partial<VbaTransfer> = {}): VbaTransfer => ({
  event_id: 'event-1',
  transfer_id: 'transfer-1',
  status: 'confirmed',
  event_timestamp: '2026-10-21T14:59:26.769Z',
  updated_at: '2026-10-22T12:00:00.000Z',
  transfer: {
    sender_address: '0x1111111111111111111111111111111111111111',
    recipient_address: WALLET.toLowerCase(),
    network: 'Monad',
    amount: '1000.000000',
    asset: 'mUSD',
    transaction_hash: HASH,
  },
  ...overrides,
});

describe('mapMoneyVbaTransfers', () => {
  it('maps confirmed mUSD settlement into the completed bank-transfer shape', () => {
    const result = mapMoneyVbaTransfers([transfer()], WALLET);

    expect(result.completed).toEqual([
      {
        kind: 'bank_transfer',
        hash: HASH,
        time: Date.parse('2026-10-21T14:59:26.769Z'),
        chainId: '0x8f',
        token: {
          address: expect.any(String),
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '1000000000',
        receivedFrom: '0x1111111111111111111111111111111111111111',
        status: 'confirmed',
      },
    ]);
    expect(result.pending).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it.each([
    [
      'wrong network',
      transfer({ transfer: { ...transfer().transfer, network: 'Ethereum' } }),
    ],
    [
      'wrong asset',
      transfer({ transfer: { ...transfer().transfer, asset: 'USDC' } }),
    ],
    [
      'different wallet',
      transfer({
        transfer: {
          ...transfer().transfer,
          recipient_address: '0x1111111111111111111111111111111111111111',
        },
      }),
    ],
    [
      'missing transaction hash',
      transfer({
        transfer: { ...transfer().transfer, transaction_hash: null },
      }),
    ],
    [
      'fractional minimal units',
      transfer({ transfer: { ...transfer().transfer, amount: '0.0000001' } }),
    ],
    [
      'bad amount',
      transfer({ transfer: { ...transfer().transfer, amount: 'bad' } }),
    ],
    ['bad timestamp', transfer({ event_timestamp: 'bad' })],
  ])('ignores %s records', (_label, row) => {
    const result = mapMoneyVbaTransfers([row], WALLET);

    expect(result.completed).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('maps processing and error transfers into pending and failed rows', () => {
    const processing = transfer({
      transfer_id: 'processing-1',
      status: 'processing',
      transfer: { ...transfer().transfer, transaction_hash: null },
    });
    const error = transfer({
      transfer_id: 'error-1',
      status: 'error',
      event_timestamp: '2026-10-22T00:00:00.000Z',
    });

    const result = mapMoneyVbaTransfers([processing, error], WALLET);

    expect(result.completed).toEqual([]);
    expect(result.pending).toEqual([
      {
        id: 'processing-1',
        autorampId: 'processing-1',
        status: 'Pending',
        time: Date.parse('2026-10-21T14:59:26.769Z'),
        destinationAmount: '1000.000000',
        transactionHash: undefined,
      },
    ]);
    expect(result.failed).toEqual([
      expect.objectContaining({
        id: 'error-1',
        status: 'Failed',
        transactionHash: HASH,
      }),
    ]);
  });

  it('deduplicates completed transfers by settlement hash and sorts newest first', () => {
    const older = transfer({
      event_id: 'old',
      event_timestamp: '2026-10-20T00:00:00.000Z',
    });
    const duplicate = transfer({ event_id: 'duplicate' });
    const newer = transfer({
      event_id: 'new',
      transfer: {
        ...transfer().transfer,
        transaction_hash: `0x${'b'.repeat(64)}`,
      },
      event_timestamp: '2026-10-22T00:00:00.000Z',
    });

    const result = mapMoneyVbaTransfers([older, duplicate, newer], WALLET);

    expect(result.completed.map((item) => item.hash)).toEqual([
      `0x${'b'.repeat(64)}`,
      HASH,
    ]);
    expect(result.completed).toHaveLength(2);
  });
});
