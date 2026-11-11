jest.mock('../utils', () => ({
  encodeApprove: jest.fn(({ spender }) => `approve:${spender}`),
  encodeErc1155Approve: jest.fn(({ spender }) => `setApproval:${spender}`),
}));

import { compileRequirementTransactions } from './compileRequirementTransactions';
import { getPositionsAllowanceRequirements } from './positionsAllowanceRequirements';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { filterDepositWalletUnsupportedRequirements } from './v2AllowanceRequirements';
import { POLYMARKET_POSITIONS_PROTOCOL } from '../protocol/definitions';
import { PERMIT2_ADDRESS } from '../safe/constants';

const { collateral, contracts } = POLYMARKET_POSITIONS_PROTOCOL;
const ownerAddress = '0x1111111111111111111111111111111111111111';

describe('positions allowance requirements', () => {
  it('returns the pUSD allowance, the PositionManager operator approval for ExchangeV3, and the Permit2 fee allowance', () => {
    const requirements = getPositionsAllowanceRequirements();

    expect(requirements).toEqual([
      {
        type: 'erc20-allowance',
        tokenAddress: collateral.tradingToken,
        spender: contracts.exchange,
      },
      {
        type: 'erc1155-operator',
        tokenAddress: contracts.positionManager,
        operator: contracts.exchange,
      },
      {
        type: 'erc20-allowance',
        tokenAddress: collateral.feeAuthorizationToken,
        spender: PERMIT2_ADDRESS,
      },
    ]);
  });

  it('drops only the Permit2 allowance through the deposit-wallet filter', () => {
    const requirements = getPositionsAllowanceRequirements();

    expect(filterDepositWalletUnsupportedRequirements(requirements)).toEqual(
      requirements.slice(0, 2),
    );
  });

  it('compiles the Safe allowancesTx approvals in order', () => {
    const transactions = compileRequirementTransactions(
      getPositionsAllowanceRequirements(),
    );

    expect(transactions).toEqual([
      {
        to: collateral.tradingToken,
        data: `approve:${contracts.exchange}`,
        operation: 0,
        value: '0',
      },
      {
        to: contracts.positionManager,
        data: `setApproval:${contracts.exchange}`,
        operation: 0,
        value: '0',
      },
      {
        to: collateral.feeAuthorizationToken,
        data: `approve:${PERMIT2_ADDRESS}`,
        operation: 0,
        value: '0',
      },
    ]);
  });

  it('inspects missing positions requirements with on-chain reads', async () => {
    const readAllowance = jest.fn().mockResolvedValue(1n);
    const readIsApprovedForAll = jest.fn().mockResolvedValue(false);
    const requirements = getPositionsAllowanceRequirements();

    const missing = await inspectMissingRequirements({
      address: ownerAddress,
      requirements,
      readAllowance,
      readIsApprovedForAll,
    });

    expect(missing).toEqual([requirements[1]]);
    expect(readAllowance).toHaveBeenCalledWith({
      tokenAddress: collateral.tradingToken,
      owner: ownerAddress,
      spender: contracts.exchange,
    });
    expect(readIsApprovedForAll).toHaveBeenCalledWith({
      tokenAddress: contracts.positionManager,
      owner: ownerAddress,
      operator: contracts.exchange,
    });
  });
});
