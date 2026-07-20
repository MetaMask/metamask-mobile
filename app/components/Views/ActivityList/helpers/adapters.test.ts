import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { normalizeTransaction } from './adapters';

const address = '0x9bed78535d6a03a955f1504aadba974d9a29e292';
const recipient = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';
const token = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

const makeTx = (
  overrides: Partial<V1TransactionByHashResponse> = {},
): V1TransactionByHashResponse =>
  ({
    blockNumber: 10,
    chainId: 8453,
    from: address,
    gas: '21000',
    gasPrice: '1',
    gasUsed: '21000',
    hash: '0xhash',
    isError: false,
    methodId: '0x',
    nonce: 7,
    timestamp: '2026-01-01T00:00:00.000Z',
    to: recipient,
    value: '1',
    valueTransfers: [],
    ...overrides,
  }) as unknown as V1TransactionByHashResponse;

describe('normalizeTransaction', () => {
  it('normalizes a simple send into TransactionMeta', () => {
    const meta = normalizeTransaction(address, makeTx());

    expect(meta).toMatchObject({
      chainId: '0x2105',
      hash: '0xhash',
      id: '0xhash-8453',
      status: TransactionStatus.confirmed,
      time: 1767225600000,
      type: TransactionType.simpleSend,
      txParams: {
        chainId: '0x2105',
        from: address,
        to: recipient,
        value: '0x1',
      },
    });
  });

  it('marks errored transactions as failed and maps known calldata method ids', () => {
    expect(
      normalizeTransaction(
        address,
        makeTx({
          isError: true,
          methodId: '0x095ea7b3',
          to: token,
          value: '0',
        }),
      ),
    ).toMatchObject({
      error: expect.any(Error),
      status: TransactionStatus.failed,
      type: TransactionType.tokenMethodApprove,
    });

    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0xa9059cbb', to: token, value: '0' }),
      ).type,
    ).toBe(TransactionType.tokenMethodTransfer);
    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0x23b872dd', to: token, value: '0' }),
      ).type,
    ).toBe(TransactionType.tokenMethodTransferFrom);
    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0xf242432a', to: token, value: '0' }),
      ).type,
    ).toBe(TransactionType.tokenMethodSafeTransferFrom);
    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0x39509351', to: token, value: '0' }),
      ).type,
    ).toBe(TransactionType.tokenMethodIncreaseAllowance);
  });

  it('normalizes incoming token transfers using transfer information and recipient address', () => {
    const sender = '0x1111111111111111111111111111111111111111';
    const meta = normalizeTransaction(
      address,
      makeTx({
        from: sender,
        to: token,
        value: '0',
        valueTransfers: [
          {
            amount: '1000000',
            contractAddress: token,
            decimal: 6,
            from: sender,
            name: 'USD Coin',
            symbol: 'USDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      }),
    );

    expect(meta).toMatchObject({
      isTransfer: true,
      transferInformation: {
        amount: '1000000',
        contractAddress: token,
        decimals: 6,
        symbol: 'USDC',
      },
      type: TransactionType.incoming,
      txParams: {
        to: address,
        value: '0xf4240',
      },
    });
  });

  it('classifies contract deployments and value-bearing contract interactions', () => {
    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0xabcdef12', to: undefined, value: '0' }),
      ).type,
    ).toBe(TransactionType.deployContract);

    expect(
      normalizeTransaction(
        address,
        makeTx({ methodId: '0xabcdef12', to: recipient, value: '1' }),
      ).type,
    ).toBe(TransactionType.contractInteraction);
  });
});
