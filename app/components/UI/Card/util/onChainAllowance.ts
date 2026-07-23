import { ethers } from 'ethers';

const ERC20_BALANCE_ALLOWANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export interface OnChainAllowanceAndBalance {
  balance: string;
  allowance: string;
  spendableBalance: string;
}

export async function readErc20AllowanceAndBalance(
  provider: ethers.providers.Provider,
  tokenAddress: string,
  owner: string,
  spender: string,
  decimals: number,
): Promise<OnChainAllowanceAndBalance> {
  const token = new ethers.Contract(
    tokenAddress,
    ERC20_BALANCE_ALLOWANCE_ABI,
    provider,
  );

  const [rawBalance, rawAllowance]: [ethers.BigNumber, ethers.BigNumber] =
    await Promise.all([
      token.balanceOf(owner),
      token.allowance(owner, spender),
    ]);

  const balance = ethers.utils.formatUnits(rawBalance, decimals);
  const allowance = ethers.utils.formatUnits(rawAllowance, decimals);
  const balanceFloat = parseFloat(balance);
  const allowanceFloat = parseFloat(allowance);
  const spendableBalance = Math.min(
    Number.isFinite(balanceFloat) ? balanceFloat : 0,
    Number.isFinite(allowanceFloat) ? allowanceFloat : 0,
  ).toString();

  return { balance, allowance, spendableBalance };
}
