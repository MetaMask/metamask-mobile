import {
  CTF_COLLATERAL_ADAPTER_ADDRESS,
  DEFAULT_CLOB_BASE_URL,
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS_V2,
  NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
  USDC_E_ADDRESS,
} from '../constants';
import Logger from '../../../../../../util/Logger';
import {
  POLYMARKET_V2_PROTOCOL,
  getClobV2BuilderCode,
  getProtocolDepositTokenAddress,
  getProtocolWithdrawTokenAddress,
} from './definitions';

describe('polymarket protocol definitions', () => {
  const originalBuilderCode = process.env.MM_PREDICT_BUILDER_CODE;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.MM_PREDICT_BUILDER_CODE;
    logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  afterAll(() => {
    if (originalBuilderCode === undefined) {
      delete process.env.MM_PREDICT_BUILDER_CODE;
      return;
    }

    process.env.MM_PREDICT_BUILDER_CODE = originalBuilderCode;
  });

  it('defines CLOB v2 as the only protocol', () => {
    expect(POLYMARKET_V2_PROTOCOL).toEqual(
      expect.objectContaining({
        key: 'v2',
        contracts: MATIC_CONTRACTS_V2,
        transport: {
          clobBaseUrl: DEFAULT_CLOB_BASE_URL,
          clobVersionHeader: '2',
        },
        workflow: {
          depositMode: 'pusd-transfer',
          withdrawMode: 'pusd-transfer',
        },
      }),
    );
  });

  it('keeps legacy USDC.e only as sweep collateral state', () => {
    expect(POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken).toBe(
      USDC_E_ADDRESS,
    );
    expect(POLYMARKET_V2_PROTOCOL.collateral.tradingToken).toBe(
      MATIC_CONTRACTS_V2.collateral,
    );
    expect(POLYMARKET_V2_PROTOCOL.collateral.claimToken).toBe(
      MATIC_CONTRACTS_V2.collateral,
    );
    expect(POLYMARKET_V2_PROTOCOL.collateral.feeAuthorizationToken).toBe(
      MATIC_CONTRACTS_V2.collateral,
    );
  });

  it('reads the builder code from MM_PREDICT_BUILDER_CODE', () => {
    process.env.MM_PREDICT_BUILDER_CODE =
      '0x1111111111111111111111111111111111111111111111111111111111111111';

    expect(getClobV2BuilderCode()).toBe(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('falls back to zero builder code when MM_PREDICT_BUILDER_CODE is missing', () => {
    process.env.MM_PREDICT_BUILDER_CODE = '';

    expect(getClobV2BuilderCode()).toBe(HASH_ZERO_BYTES32);
    expect(logSpy).toHaveBeenCalledWith(
      'Polymarket CLOB v2 builder code missing in MM_PREDICT_BUILDER_CODE; falling back to zero bytes32 value',
    );
  });

  it('falls back to zero builder code when MM_PREDICT_BUILDER_CODE is invalid', () => {
    process.env.MM_PREDICT_BUILDER_CODE = 'invalid';

    expect(getClobV2BuilderCode()).toBe(HASH_ZERO_BYTES32);
    expect(logSpy).toHaveBeenCalledWith(
      'Polymarket CLOB v2 builder code invalid in MM_PREDICT_BUILDER_CODE; falling back to zero bytes32 value',
    );
  });

  it('routes claims through the collateral adapters', () => {
    expect(POLYMARKET_V2_PROTOCOL.claim).toEqual({
      standardTarget: CTF_COLLATERAL_ADAPTER_ADDRESS,
      negRiskTarget: NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
    });
  });

  it('returns pUSD for deposit and withdraw token addresses', () => {
    expect(getProtocolDepositTokenAddress(POLYMARKET_V2_PROTOCOL)).toBe(
      MATIC_CONTRACTS_V2.collateral,
    );
    expect(getProtocolWithdrawTokenAddress(POLYMARKET_V2_PROTOCOL)).toBe(
      MATIC_CONTRACTS_V2.collateral,
    );
  });
});
