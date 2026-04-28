jest.mock('./core', () => {
  const actual = jest.requireActual('./core');

  return {
    ...actual,
    buildSignedSafeExecution: jest.fn(),
    getRawTokenBalance: jest.fn(),
  };
});

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn().mockResolvedValue([]),
}));

jest.mock('./compileRequirementTransactions', () => ({
  compileRequirementTransactions: jest.fn(() => []),
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

  it('sweeps legacy Safe USDC.e state and transfers pUSD directly', async () => {
    mockGetRawTokenBalance.mockResolvedValueOnce(1_000_000n);

    const plan = await planWithdraw({
      signer,
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: 1_000_000n,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(plan.safeLegacyUsdceBalance).toBe(1_000_000n);
    expect(mockGetRawTokenBalance).toHaveBeenCalledTimes(1);
    expect(mockGetRawTokenBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    });
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });
});
