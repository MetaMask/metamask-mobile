import {
  POLYMARKET_V1_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
  getClobV2BuilderCode,
  resolvePolymarketProtocol,
} from './definitions';

describe('polymarket protocol definitions', () => {
  const originalEnvironment = process.env.METAMASK_ENVIRONMENT;
  const originalDevBuilderCode =
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_DEV_BUILDER_CODE;
  const originalProdBuilderCode =
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_PROD_BUILDER_CODE;

  beforeEach(() => {
    delete process.env.MM_PREDICT_POLYMARKET_CLOB_V2_DEV_BUILDER_CODE;
    delete process.env.MM_PREDICT_POLYMARKET_CLOB_V2_PROD_BUILDER_CODE;
  });

  afterAll(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnvironment;
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_DEV_BUILDER_CODE =
      originalDevBuilderCode;
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_PROD_BUILDER_CODE =
      originalProdBuilderCode;
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

  it('reads the dev builder code in dev builds', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_DEV_BUILDER_CODE =
      '0x1111111111111111111111111111111111111111111111111111111111111111';

    expect(getClobV2BuilderCode('dev')).toBe(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    );
  });

  it('reads the prod builder code outside dev builds', () => {
    process.env.METAMASK_ENVIRONMENT = 'prod';
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_PROD_BUILDER_CODE =
      '0x2222222222222222222222222222222222222222222222222222222222222222';

    expect(getClobV2BuilderCode('prod')).toBe(
      '0x2222222222222222222222222222222222222222222222222222222222222222',
    );
  });

  it('throws when a valid builder code is not configured', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_PREDICT_POLYMARKET_CLOB_V2_DEV_BUILDER_CODE = 'invalid';

    expect(() => getClobV2BuilderCode('dev')).toThrow(
      'Missing valid Polymarket CLOB v2 builder code',
    );
  });
});
