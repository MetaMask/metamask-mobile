import { TransactionMeta } from '@metamask/transaction-controller';

import {
  getNetworkRpcUrl,
  extractRpcDomain,
  RpcDomainStatus,
} from '../../../../../util/rpc-domain-utils';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getRPCMetricsProperties } from './rpc';

jest.mock('../../../../../util/rpc-domain-utils', () => ({
  getNetworkRpcUrl: jest.fn(),
  extractRpcDomain: jest.fn(),
  RpcDomainStatus: {
    Invalid: 'invalid',
    Private: 'private',
    Unknown: 'unknown',
  },
}));

const createMockRequest = (
  chainId: string,
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
  transactionMeta: { chainId } as TransactionMeta,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn(),
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
});

describe('getRPCMetricsProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the correct shape for a known domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue('example.com');
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('https://example.com');

    expect(getRPCMetricsProperties(createMockRequest('0x1'))).toEqual({
      properties: { rpc_domain: 'example.com' },
      sensitiveProperties: {},
    });
  });

  it('returns the correct shape for an invalid domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue(RpcDomainStatus.Invalid);
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('invalid-url');

    expect(getRPCMetricsProperties(createMockRequest('0x2'))).toEqual({
      properties: { rpc_domain: RpcDomainStatus.Invalid },
      sensitiveProperties: {},
    });
  });

  it('returns the correct shape for a private domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue(RpcDomainStatus.Private);
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('http://localhost:8545');

    expect(getRPCMetricsProperties(createMockRequest('0x3'))).toEqual({
      properties: { rpc_domain: RpcDomainStatus.Private },
      sensitiveProperties: {},
    });
  });

  it('returns empty properties for non-finalized events', () => {
    const request = {
      ...createMockRequest('0x1'),
      eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
    };

    expect(getRPCMetricsProperties(request)).toEqual(EMPTY_METRICS);
  });
});
