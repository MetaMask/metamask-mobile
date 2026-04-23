import { tronRequestMapper, tronResponseMapper } from './request-mapper';

describe('tronRequestMapper', () => {
  it('maps tron_signMessage to canonical signMessage with address and message', () => {
    expect(
      tronRequestMapper({
        method: 'tron_signMessage',
        params: [{ address: 'TAddr', message: '0x1234' }],
      }),
    ).toEqual({
      method: 'signMessage',
      params: { address: 'TAddr', message: '0x1234' },
    });
  });

  it('maps tron_signTransaction extracting raw_data_hex and type', () => {
    expect(
      tronRequestMapper({
        method: 'tron_signTransaction',
        params: [
          {
            address: 'TAddr',
            transaction: {
              raw_data_hex: '0xabc',
              type: 'TransferContract',
            },
          },
        ],
      }),
    ).toEqual({
      method: 'signTransaction',
      params: {
        address: 'TAddr',
        transaction: { rawDataHex: '0xabc', type: 'TransferContract' },
      },
    });
  });

  it('maps tron_sendTransaction and tron_getBalance to canonical names', () => {
    expect(
      tronRequestMapper({ method: 'tron_sendTransaction', params: [] }),
    ).toEqual({ method: 'sendTransaction', params: [] });
    expect(
      tronRequestMapper({ method: 'tron_getBalance', params: [] }),
    ).toEqual({
      method: 'getBalance',
      params: [],
    });
  });

  it('returns the request unchanged for unknown methods', () => {
    expect(
      tronRequestMapper({ method: 'some_other_method', params: [1] }),
    ).toEqual({
      method: 'some_other_method',
      params: [1],
    });
  });
});

describe('tronResponseMapper', () => {
  it('wraps a bare signature result into the legacy transaction+signature shape', () => {
    const wrapped = tronResponseMapper({
      method: 'tron_signTransaction',
      params: [
        {
          transaction: {
            transaction: { raw_data_hex: '0xabc', type: 'TransferContract' },
          },
        },
      ],
      result: { signature: '0xdeadbeef' },
    });

    expect(wrapped).toEqual({
      raw_data_hex: '0xabc',
      type: 'TransferContract',
      signature: ['0xdeadbeef'],
    });
  });

  it('leaves a fully-shaped (txID-bearing) result alone', () => {
    const result = { txID: '0xabc', signature: ['0xdef'] };
    expect(
      tronResponseMapper({
        method: 'tron_signTransaction',
        params: [{ transaction: { raw_data_hex: '0xabc' } }],
        result,
      }),
    ).toBe(result);
  });

  it('passes through results for non-sign methods', () => {
    const result = { balance: '123' };
    expect(
      tronResponseMapper({
        method: 'tron_getBalance',
        params: [],
        result,
      }),
    ).toBe(result);
  });
});
