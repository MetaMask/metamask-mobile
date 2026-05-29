import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  APPROVE_FUNCTION_SIGNATURE,
  TRANSFER_FUNCTION_SIGNATURE,
} from '../../../../util/transactions';
import { normalizeTransaction } from './adapters';

describe('normalizeTransaction', () => {
  const address = '0x0000000000000000000000000000000000000001';
  const otherAddress = '0x0000000000000000000000000000000000000002';
  const contractAddress = '0x00000000000000000000000000000000000000aa';

  const buildTransaction = (
    overrides: Partial<V1TransactionByHashResponse> = {},
  ): V1TransactionByHashResponse =>
    ({
      hash: '0xhash',
      timestamp: '2024-01-01T00:00:00Z',
      chainId: 1,
      blockNumber: 100,
      blockHash: '0xblock',
      gas: 21000,
      gasUsed: 21000,
      gasPrice: '1000000000',
      effectiveGasPrice: '1000000000',
      nonce: 0,
      cumulativeGasUsed: 21000,
      value: '1000',
      to: otherAddress,
      from: address,
      methodId: '0x',
      isError: false,
      ...overrides,
    }) as unknown as V1TransactionByHashResponse;

  it('normalizes a simple outgoing send', () => {
    const meta = normalizeTransaction(address, buildTransaction());

    expect(meta).toEqual(
      expect.objectContaining({
        hash: '0xhash',
        id: '0xhash-1',
        chainId: '0x1',
        status: TransactionStatus.confirmed,
        type: TransactionType.simpleSend,
        isTransfer: false,
        networkClientId: '',
        toSmartContract: false,
        verifiedOnBlockchain: false,
        blockNumber: '100',
        time: Date.parse('2024-01-01T00:00:00Z'),
        error: undefined,
        transferInformation: undefined,
      }),
    );
    expect(meta.txParams).toEqual(
      expect.objectContaining({
        chainId: '0x1',
        from: address,
        to: otherAddress,
        value: '0x3e8',
        gas: '0x5208',
        gasPrice: '0x3b9aca00',
        gasUsed: '0x5208',
        nonce: '0x0',
      }),
    );
  });

  it('marks the transaction as failed when isError is true', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({ isError: true }),
    );

    expect(meta.status).toBe(TransactionStatus.failed);
    expect(meta.error).toBeInstanceOf(Error);
    expect(meta.error?.message).toBe('Transaction failed');
  });

  it('marks an outgoing transaction with no `to` and calldata as deployContract', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({
        to: undefined as unknown as string,
        methodId: '0xabcdef',
      }),
    );

    expect(meta.type).toBe(TransactionType.deployContract);
  });

  it('classifies an incoming transaction', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({ from: otherAddress, to: address }),
    );

    expect(meta.type).toBe(TransactionType.incoming);
  });

  it('detects ERC20 transfer method', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({
        methodId: TRANSFER_FUNCTION_SIGNATURE,
        value: '0',
      }),
    );

    expect(meta.type).toBe(TransactionType.tokenMethodTransfer);
  });

  it('detects ERC20 approve method', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({
        methodId: APPROVE_FUNCTION_SIGNATURE,
        value: '0',
      }),
    );

    expect(meta.type).toBe(TransactionType.tokenMethodApprove);
  });

  it('classifies a contract interaction when calldata has value', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({
        methodId: '0xdeadbeef',
        value: '1000',
      }),
    );

    expect(meta.type).toBe(TransactionType.contractInteraction);
  });

  it('extracts transfer information for an incoming token transfer and rewrites txParams', () => {
    const meta = normalizeTransaction(
      address,
      buildTransaction({
        from: otherAddress,
        to: contractAddress,
        value: '0',
        valueTransfers: [
          {
            from: otherAddress,
            to: address,
            amount: '5000',
            contractAddress,
            decimal: 6,
            symbol: 'USDC',
          },
        ],
      } as Partial<V1TransactionByHashResponse>),
    );

    expect(meta.isTransfer).toBe(true);
    expect(meta.transferInformation).toEqual({
      amount: '5000',
      contractAddress,
      decimals: 6,
      symbol: 'USDC',
    });
    expect(meta.txParams.to).toBe(address);
    expect(meta.txParams.value).toBe('0x1388');
  });
});
