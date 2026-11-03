import { buildOhlcvChannel, OHLCV_SUBSCRIPTION_NAMESPACE } from './ohlcv';

describe('buildOhlcvChannel', () => {
  it('uses the ohlcv.v1 namespace', () => {
    expect(OHLCV_SUBSCRIPTION_NAMESPACE).toBe('ohlcv.v1');
    expect(buildOhlcvChannel('eip155:1/slip44:60', '1m', 'usd')).toBe(
      'ohlcv.v1.eip155:1/slip44:60.1m.usd',
    );
  });
});
