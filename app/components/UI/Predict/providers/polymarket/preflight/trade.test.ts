jest.mock('./core', () => ({
  buildSignedSafeExecutionIfNeeded: jest.fn(),
  compileAllowanceMaintenanceTransactions: jest.fn(),
  getRawTokenBalance: jest.fn(),
}));

jest.mock('./inspectMissingRequirements', () => ({
  inspectMissingRequirements: jest.fn(),
}));

import { TransactionType } from '@metamask/transaction-controller';
import { OperationType, type SafeTransaction } from '../safe/types';
import {
  MATIC_CONTRACTS_V2,
  MATIC_POSITIONS_PROTOCOL_CONTRACTS,
  COLLATERAL_ONRAMP_ADDRESS,
  USDC_E_ADDRESS,
} from '../constants';
import { PERMIT2_ADDRESS } from '../safe/constants';
import {
  POLYMARKET_POSITIONS_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
} from '../protocol/definitions';
import {
  buildSignedSafeExecutionIfNeeded,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { buildTradeAllowancesTx, planTradePreflight } from './trade';

const safeAddress = '0x1111111111111111111111111111111111111111';
const missingRequirements = [
  {
    type: 'erc20-allowance',
    tokenAddress: MATIC_CONTRACTS_V2.collateral,
    spender: MATIC_POSITIONS_PROTOCOL_CONTRACTS.exchange,
  },
] as const;
const transactions: SafeTransaction[] = [
  {
    to: MATIC_CONTRACTS_V2.collateral,
    data: '0xapprove',
    operation: OperationType.Call,
    value: '0',
  },
];

const mockGetRawTokenBalance = jest.mocked(getRawTokenBalance);
const mockInspectMissingRequirements = jest.mocked(inspectMissingRequirements);
const mockCompileAllowanceMaintenanceTransactions = jest.mocked(
  compileAllowanceMaintenanceTransactions,
);
const mockBuildSignedSafeExecutionIfNeeded = jest.mocked(
  buildSignedSafeExecutionIfNeeded,
);

describe('planTradePreflight with the positions protocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInspectMissingRequirements.mockResolvedValue([...missingRequirements]);
    mockCompileAllowanceMaintenanceTransactions.mockReturnValue(transactions);
  });

  it('inspects the positions requirements and anchors maintenance to the CTF definition', async () => {
    const plan = await planTradePreflight({
      tradeProtocol: POLYMARKET_POSITIONS_PROTOCOL,
      safeAddress,
      safeUsdceBalance: 5n,
    });

    expect(mockGetRawTokenBalance).not.toHaveBeenCalled();
    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: safeAddress,
      requirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: MATIC_CONTRACTS_V2.collateral,
          spender: MATIC_POSITIONS_PROTOCOL_CONTRACTS.exchange,
        },
        {
          type: 'erc1155-operator',
          tokenAddress: MATIC_POSITIONS_PROTOCOL_CONTRACTS.positionManager,
          operator: MATIC_POSITIONS_PROTOCOL_CONTRACTS.exchange,
        },
        {
          type: 'erc20-allowance',
          tokenAddress: MATIC_CONTRACTS_V2.collateral,
          spender: PERMIT2_ADDRESS,
        },
        {
          type: 'erc20-allowance',
          tokenAddress: USDC_E_ADDRESS,
          spender: COLLATERAL_ONRAMP_ADDRESS,
        },
      ],
    });
    expect(mockCompileAllowanceMaintenanceTransactions).toHaveBeenCalledWith({
      safeAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
      missingRequirements: [...missingRequirements],
      usdceBalance: 5n,
    });
    expect(plan).toEqual({
      missingRequirements: [...missingRequirements],
      safeUsdceBalance: 5n,
      transactions,
    });
  });

  it('drops the legacy-sweep requirement when there is no USDC.e to wrap', async () => {
    await planTradePreflight({
      tradeProtocol: POLYMARKET_POSITIONS_PROTOCOL,
      safeAddress,
      safeUsdceBalance: 0n,
    });

    expect(mockInspectMissingRequirements).toHaveBeenCalledWith({
      address: safeAddress,
      requirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: MATIC_CONTRACTS_V2.collateral,
          spender: MATIC_POSITIONS_PROTOCOL_CONTRACTS.exchange,
        },
        {
          type: 'erc1155-operator',
          tokenAddress: MATIC_POSITIONS_PROTOCOL_CONTRACTS.positionManager,
          operator: MATIC_POSITIONS_PROTOCOL_CONTRACTS.exchange,
        },
        {
          type: 'erc20-allowance',
          tokenAddress: MATIC_CONTRACTS_V2.collateral,
          spender: PERMIT2_ADDRESS,
        },
      ],
    });
  });

  it('reads the legacy USDC.e balance when none is provided', async () => {
    mockGetRawTokenBalance.mockResolvedValue(7n);

    const plan = await planTradePreflight({
      safeAddress,
      tradeProtocol: POLYMARKET_POSITIONS_PROTOCOL,
    });

    expect(mockGetRawTokenBalance).toHaveBeenCalledWith({
      address: safeAddress,
      tokenAddress: USDC_E_ADDRESS,
    });
    expect(plan.safeUsdceBalance).toBe(7n);
  });
});

describe('buildTradeAllowancesTx with the positions protocol', () => {
  const signer = {
    address: '0x1111111111111111111111111111111111111111',
    signPersonalMessage: jest.fn(),
    signTypedMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInspectMissingRequirements.mockResolvedValue([...missingRequirements]);
    mockCompileAllowanceMaintenanceTransactions.mockReturnValue(transactions);
  });

  it('signs the positions preflight plan as a Safe execution', async () => {
    mockBuildSignedSafeExecutionIfNeeded.mockResolvedValue({
      params: { to: MATIC_CONTRACTS_V2.collateral, data: '0xapprove' },
      type: TransactionType.contractInteraction,
    } as never);

    const allowancesTx = await buildTradeAllowancesTx({
      tradeProtocol: POLYMARKET_POSITIONS_PROTOCOL,
      signer,
      safeAddress,
      safeUsdceBalance: 5n,
    });

    expect(mockBuildSignedSafeExecutionIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress,
        transactions,
        type: TransactionType.contractInteraction,
      }),
    );
    expect(allowancesTx).toEqual({
      to: MATIC_CONTRACTS_V2.collateral,
      data: '0xapprove',
    });
  });

  it('returns undefined when no execution is needed', async () => {
    mockBuildSignedSafeExecutionIfNeeded.mockResolvedValue(undefined);

    const allowancesTx = await buildTradeAllowancesTx({
      tradeProtocol: POLYMARKET_POSITIONS_PROTOCOL,
      signer,
      safeAddress,
      safeUsdceBalance: 5n,
    });

    expect(allowancesTx).toBeUndefined();
  });
});
