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

jest.mock('../safe/utils', () => ({
  ...jest.requireActual('../safe/utils'),
  getPreValidatedSafeTransactionCallData: jest.fn(() => '0xpreValidated'),
}));

import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { getRawTokenBalance } from './core';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { getPreValidatedSafeTransactionCallData } from '../safe/utils';
import { buildUnsignedWithdrawTransaction, planWithdraw } from './withdraw';

const mockGetRawTokenBalance = getRawTokenBalance as jest.MockedFunction<
  typeof getRawTokenBalance
>;
const mockInspectMissingRequirements =
  inspectMissingRequirements as jest.MockedFunction<
    typeof inspectMissingRequirements
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
    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      requirements: expect.arrayContaining([
        expect.objectContaining({
          tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
          spender: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
        }),
        expect.objectContaining({
          tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        }),
      ]),
    });
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });
});

describe('buildUnsignedWithdrawTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encodes the planned Safe withdraw with a pre-validated signature', async () => {
    const safeAddress = '0x9999999999999999999999999999999999999999';

    const result = await buildUnsignedWithdrawTransaction({
      signer,
      safeAddress,
      requestedAmountRaw: 1_000_000n,
      protocol: POLYMARKET_V2_PROTOCOL,
      safeLegacyUsdceBalance: 0n,
    });

    expect(getPreValidatedSafeTransactionCallData).toHaveBeenCalledWith({
      ownerAddress: signer.address,
      txn: expect.objectContaining({
        to: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        data: '0xtransfer',
      }),
    });
    expect(result).toEqual({ to: safeAddress, data: '0xpreValidated' });
  });
});
