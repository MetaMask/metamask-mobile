import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';

import { getBatchMetricsProperties } from './batch';
import { TransactionMetricsBuilderRequest } from '../types';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { getMethodData } from '../../../../../util/transactions';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';

jest.mock('../../../../../util/transactions', () => ({
  getMethodData: jest.fn(),
}));

const mockGetMethodData = jest.mocked(getMethodData);

const createMockRequest = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
  transactionMeta: {
    txParams: {},
    ...overrides,
  } as TransactionMeta,
  allTransactions: [],
  getUIMetrics: jest.fn(),
  getState: jest.fn() as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
});

describe('getBatchMetricsProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns api_method as wallet_sendCalls for external batch transactions', async () => {
    const request = createMockRequest({
      origin: 'https://example.com',
      nestedTransactions: [{ type: TransactionType.simpleSend }],
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.api_method).toBe('wallet_sendCalls');
  });

  it('returns api_method as eth_sendTransaction for external non-batch transactions', async () => {
    const request = createMockRequest({
      origin: 'https://example.com',
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.api_method).toBe('eth_sendTransaction');
  });

  it('does not set api_method for internal transactions', async () => {
    const request = createMockRequest({
      origin: ORIGIN_METAMASK,
      nestedTransactions: [{ type: TransactionType.simpleSend }],
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.api_method).toBeUndefined();
  });

  it('returns batch properties for batch transactions', async () => {
    mockGetMethodData.mockResolvedValue({ name: 'transfer' } as never);
    const request = createMockRequest({
      nestedTransactions: [
        { type: TransactionType.contractInteraction, to: '0x123', data: '0x1' },
        { type: TransactionType.contractInteraction, to: '0x456', data: '0x2' },
      ],
      networkClientId: 'mainnet',
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.batch_transaction_count).toBe(2);
    expect(result.properties.batch_transaction_method).toBe('eip7702');
    expect(result.properties.transaction_contract_address).toEqual([
      '0x123',
      '0x456',
    ]);
  });

  it('returns eip7702_upgrade_transaction as true when authorizationList exists', async () => {
    const request = createMockRequest({
      txParams: {
        from: '0xuser',
        authorizationList: [{ address: '0x1' }],
      },
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.eip7702_upgrade_transaction).toBe(true);
  });

  it('returns eip7702_upgrade_rejection as true for rejected upgrade transactions', async () => {
    const request = createMockRequest({
      status: TransactionStatus.rejected,
      txParams: {
        from: '0xuser',
        authorizationList: [{ address: '0x1' }],
      },
      error: {
        name: 'Error',
        message: 'Rejected upgrade',
        code: EIP5792ErrorCode.RejectedUpgrade as unknown as string,
      },
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.eip7702_upgrade_rejection).toBe(true);
  });

  it('returns account_eip7702_upgraded with delegation address', async () => {
    const request = createMockRequest({
      delegationAddress: '0xdelegation',
    });

    const result = await getBatchMetricsProperties(request);

    expect(result.properties.account_eip7702_upgraded).toBe('0xdelegation');
  });
});
