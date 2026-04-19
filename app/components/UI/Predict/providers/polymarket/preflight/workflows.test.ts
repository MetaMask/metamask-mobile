import { parseUnits } from 'ethers/lib/utils';
import { PredictPositionStatus, type PredictPosition } from '../../../types';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { compileClaimTransactions } from './claim';
import { compileDepositMaintenanceTransactions } from './deposit';
import { compileTradePreflightTransactions } from './trade';
import { compileWithdrawTransactions } from './withdraw';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

const missingRequirements: V2AllowanceRequirement[] = [
  {
    type: 'erc20-allowance',
    tokenAddress: '0x1000000000000000000000000000000000000000',
    spender: '0x2000000000000000000000000000000000000000',
  },
];

const claimPosition: PredictPosition = {
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Question?',
  outcomeId:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  outcomeTokenId: '123',
  outcomeIndex: 0,
  outcome: 'Yes',
  icon: 'https://example.com/icon.png',
  amount: 2,
  status: PredictPositionStatus.WON,
  endDate: '2026-01-01T00:00:00.000Z',
  size: 2,
  price: 0.5,
  currentValue: 2,
  cashPnl: 1,
  percentPnl: 100,
  claimable: true,
  avgPrice: 0.5,
  initialValue: 1,
  realizedPnl: 1,
  negRisk: false,
};

describe('preflight workflow compilers', () => {
  it('builds trade transactions as repairs first and wrap-all second', () => {
    const transactions = compileTradePreflightTransactions({
      protocol: POLYMARKET_V2_PROTOCOL,
      safeAddress: '0x1111111111111111111111111111111111111111',
      missingRequirements,
      safeUsdceBalance: 10n,
    });

    expect(transactions[0]?.to).toBe(
      '0x1000000000000000000000000000000000000000',
    );
    expect(transactions[1]?.to).toBe(
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    );
  });

  it('builds deposit maintenance with the same repair-then-wrap ordering', () => {
    const transactions = compileDepositMaintenanceTransactions({
      protocol: POLYMARKET_V2_PROTOCOL,
      safeAddress: '0x1111111111111111111111111111111111111111',
      missingRequirements,
      preExistingSafeUsdceBalance: 10n,
    });

    expect(transactions).toHaveLength(2);
    expect(transactions[0]?.to).toBe(
      '0x1000000000000000000000000000000000000000',
    );
    expect(transactions[1]?.to).toBe(
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    );
  });

  it('builds claim transactions as repairs, wrap, claim, then exact-deficit unwrap', () => {
    const transactions = compileClaimTransactions({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer: {
        address: '0x1111111111111111111111111111111111111111',
        signPersonalMessage: jest.fn(),
        signTypedMessage: jest.fn(),
      },
      positions: [claimPosition],
      safeAddress: '0x9999999999999999999999999999999999999999',
      missingRequirements,
      safeUsdceBalance: 10n,
      deficit: 5n,
    });

    expect(transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.contracts.conditionalTokens,
      POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
    ]);
  });

  it('builds withdraw fallback as repairs, optional unwrap, then usdce transfer', () => {
    const transactions = compileWithdrawTransactions({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer: {
        address: '0x1111111111111111111111111111111111111111',
        signPersonalMessage: jest.fn(),
        signTypedMessage: jest.fn(),
      },
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
      deficit: BigInt(parseUnits('1', 6).toString()),
      missingRequirements,
      mode: 'usdce-deficit-unwrap',
    });

    expect(transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    ]);
  });

  it('builds withdraw preferred mode as repairs followed by pusd transfer', () => {
    const transactions = compileWithdrawTransactions({
      protocol: POLYMARKET_V2_PROTOCOL,
      signer: {
        address: '0x1111111111111111111111111111111111111111',
        signPersonalMessage: jest.fn(),
        signTypedMessage: jest.fn(),
      },
      safeAddress: '0x9999999999999999999999999999999999999999',
      requestedAmountRaw: BigInt(parseUnits('2', 6).toString()),
      deficit: 0n,
      missingRequirements,
      mode: 'pusd-transfer',
    });

    expect(transactions.map((transaction) => transaction.to)).toEqual([
      '0x1000000000000000000000000000000000000000',
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });
});
