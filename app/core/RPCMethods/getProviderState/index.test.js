import getProviderState from '.';

describe('getProviderState', () => {
  let mockEnd;
  let mockGetProviderState;

  beforeEach(() => {
    mockEnd = jest.fn();
    mockGetProviderState = jest.fn().mockResolvedValue({
      chainId: '0x539',
      isUnlocked: true,
      networkVersion: '',
      accounts: [],
    });
  });

  it('should call getProviderState when the handler is invoked', async () => {
    const req = {
      origin: 'testOrigin',
      params: [],
      id: '22',
      jsonrpc: '2.0',
      method: 'metamask_getProviderState',
      networkClientId: '0x1',
    };

    const res = {
      id: '22',
      jsonrpc: '2.0',
      result: {
        chainId: '0x539',
        isUnlocked: true,
        networkVersion: '',
        accounts: [],
      },
    };

    await getProviderState.implementation(req, res, jest.fn(), mockEnd, {
      getProviderState: mockGetProviderState,
    });

    expect(mockGetProviderState).toHaveBeenCalledWith(req.origin, req.networkClientId);
    expect(res.result).toStrictEqual({
      chainId: '0x539',
      isUnlocked: true,
      networkVersion: '',
      accounts: [],
    });
    expect(mockEnd).toHaveBeenCalled();
  });
});
