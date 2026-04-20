jest.mock('./core', () => ({
  buildSignedSafeExecution: jest.fn(),
  getRawTokenBalance: jest.fn(),
}));

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn().mockResolvedValue([]),
}));

jest.mock('./compileRequirementTransactions', () => ({
  compileRequirementTransactions: jest.fn(() => []),
}));

jest.mock('../protocol/orderCodec', () => ({
  encodeUnwrap: jest.fn(() => '0xunwrap'),
}));

jest.mock('../utils', () => ({
  encodeErc20Transfer: jest.fn(() => '0xtransfer'),
}));

import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { getRawTokenBalance } from './core';
import { planWithdraw } from './withdraw';

const mockGetRawTokenBalance = getRawTokenBalance as jest.MockedFunction<
  typeof getRawTokenBalance
>;

const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

describe('planWithdraw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not read Safe pUSD when the Safe already has enough USDC.e', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(1_000_000n);

    const plan = await planWithdraw({
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: 1_000_000n,
      mode: 'usdce-deficit-unwrap',
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(plan.deficit).toBe(0n);
    expect(mockGetRawTokenBalance).toHaveBeenCalledTimes(1);
    expect(mockGetRawTokenBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    });
  });

  it('allows fallback withdraw when Safe pUSD covers the exact deficit', async () => {
    mockGetRawTokenBalance
      .mockResolvedValueOnce(500_000n)
      .mockResolvedValueOnce(500_000n);

    const plan = await planWithdraw({
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: 1_000_000n,
      mode: 'usdce-deficit-unwrap',
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(plan.deficit).toBe(500_000n);
    expect(mockGetRawTokenBalance).toHaveBeenCalledTimes(2);
    expect(mockGetRawTokenBalance.mock.calls[1]?.[0]).toEqual({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    });
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    ]);
  });

  it('throws when Safe pUSD is below the exact deficit', async () => {
    mockGetRawTokenBalance
      .mockResolvedValueOnce(500_000n)
      .mockResolvedValueOnce(499_999n);

    await expect(
      planWithdraw({
        signer,
        safeAddress: '0x9999999999999999999999999999999999999999',
        requestedAmountRaw: 1_000_000n,
        mode: 'usdce-deficit-unwrap',
        protocol: POLYMARKET_V2_PROTOCOL,
      }),
    ).rejects.toThrow('Insufficient Safe pUSD balance for fallback withdraw');

    expect(mockGetRawTokenBalance).toHaveBeenCalledTimes(2);
    expect(mockGetRawTokenBalance.mock.calls[1]?.[0]).toEqual({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    });
  });
});
