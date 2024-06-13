import {
  Json,
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import eth_accounts from './';

describe('eth_accounts', () => {
  const mockPermittedAccounts = ['0x1', '0x2'];
  const mockGetAccounts = jest.fn();
  let mockRes: PendingJsonRpcResponse<Json>;
  const mockReq: JsonRpcRequest<JsonRpcParams> = {
    id: '1',
    jsonrpc: '2.0',
    method: 'eth_accounts',
  };
  const mockNext = jest.fn();
  const mockEnd = jest.fn();

  beforeEach(() => {
    mockRes = { id: '1', jsonrpc: '2.0' };
    mockGetAccounts.mockReset();
  });

  it('should return array of permitted accounts', async () => {
    mockGetAccounts.mockImplementation(() => mockPermittedAccounts);

    await eth_accounts.implementation(mockReq, mockRes, mockNext, mockEnd, {
      getAccounts: mockGetAccounts,
    });

    expect(mockRes.result).toBe(mockPermittedAccounts);
    expect(mockEnd).toHaveBeenCalled();
  });

  it('should return array with no accounts', async () => {
    const expectedAccounts: string[] = [];
    mockGetAccounts.mockImplementation(() => expectedAccounts);

    await eth_accounts.implementation(mockReq, mockRes, mockNext, mockEnd, {
      getAccounts: mockGetAccounts,
    });

    expect(mockRes.result).toBe(expectedAccounts);
    expect(mockEnd).toHaveBeenCalled();
  });
});
