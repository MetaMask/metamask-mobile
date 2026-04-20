import {
  CTF_COLLATERAL_ADAPTER_ADDRESS,
  HASH_ZERO_BYTES32,
  NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
} from '../constants';
import {
  POLYMARKET_V1_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
  getClobV2BuilderCode,
  resolvePolymarketProtocol,
} from './definitions';

describe('polymarket protocol definitions', () => {
  const originalBuilderCode = process.env.MM_PREDICT_BUILDER_CODE;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.MM_PREDICT_BUILDER_CODE;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    if (originalBuilderCode === undefined) {
      delete process.env.MM_PREDICT_BUILDER_CODE;
      return;
    }

    process.env.MM_PREDICT_BUILDER_CODE = originalBuilderCode;
  });

  it('resolves v1 when predictClobV2 is disabled', () => {
    expect(resolvePolymarketProtocol({ predictClobV2Enabled: false })).toBe(
      POLYMARKET_V1_PROTOCOL,
    );
  });

  it('resolves v2 when predictClobV2 is enabled', () => {
    expect(resolvePolymarketProtocol({ predictClobV2Enabled: true })).toBe(
      POLYMARKET_V2_PROTOCOL,
    );
  });

  it('reads the builder code from MM_PREDICT_BUILDER_CODE', () => {
    process.env.MM_PREDICT_BUILDER_CODE =
      '0x1111111111111111111111111111111111111111111111111111111111111111';

    expect(getClobV2BuilderCode()).toBe(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to zero builder code when MM_PREDICT_BUILDER_CODE is missing', () => {
    process.env.MM_PREDICT_BUILDER_CODE = '';

    expect(getClobV2BuilderCode()).toBe(HASH_ZERO_BYTES32);
    expect(warnSpy).toHaveBeenCalledWith(
      'Polymarket CLOB v2 builder code missing in MM_PREDICT_BUILDER_CODE; falling back to zero bytes32 value',
    );
  });

  it('falls back to zero builder code when MM_PREDICT_BUILDER_CODE is invalid', () => {
    process.env.MM_PREDICT_BUILDER_CODE = 'invalid';

    expect(getClobV2BuilderCode()).toBe(HASH_ZERO_BYTES32);
    expect(warnSpy).toHaveBeenCalledWith(
      'Polymarket CLOB v2 builder code invalid in MM_PREDICT_BUILDER_CODE; falling back to zero bytes32 value',
    );
  });

  it('routes v2 claims through the collateral adapters', () => {
    expect(POLYMARKET_V2_PROTOCOL.claim).toEqual({
      standardTarget: CTF_COLLATERAL_ADAPTER_ADDRESS,
      negRiskTarget: NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
    });
  });
});
