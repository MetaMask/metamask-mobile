import { ethers } from 'ethers';
import { readErc20AllowanceAndBalance } from './onChainAllowance';

const TOKEN = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const OWNER = '0x1111111111111111111111111111111111111111';
const SPENDER = '0x2222222222222222222222222222222222222222';

describe('readErc20AllowanceAndBalance', () => {
  const balanceOf = jest.fn();
  const allowance = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ethers, 'Contract').mockImplementation(
      () =>
        ({
          balanceOf,
          allowance,
        }) as unknown as ethers.Contract,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns min(balance, allowance) when allowance is the limiting factor', async () => {
    // 30 USDC balance, 15 USDC allowance
    balanceOf.mockResolvedValue(ethers.BigNumber.from('30000000'));
    allowance.mockResolvedValue(ethers.BigNumber.from('15000000'));

    const result = await readErc20AllowanceAndBalance(
      {} as ethers.providers.Provider,
      TOKEN,
      OWNER,
      SPENDER,
      6,
    );

    expect(result).toStrictEqual({
      balance: '30.0',
      allowance: '15.0',
      spendableBalance: '15',
    });
    expect(balanceOf).toHaveBeenCalledWith(OWNER);
    expect(allowance).toHaveBeenCalledWith(OWNER, SPENDER);
  });

  it('returns min(balance, allowance) when wallet balance is the limiting factor', async () => {
    // 10 USDC balance, 100 USDC allowance
    balanceOf.mockResolvedValue(ethers.BigNumber.from('10000000'));
    allowance.mockResolvedValue(ethers.BigNumber.from('100000000'));

    const result = await readErc20AllowanceAndBalance(
      {} as ethers.providers.Provider,
      TOKEN,
      OWNER,
      SPENDER,
      6,
    );

    expect(result.spendableBalance).toBe('10');
    expect(result.balance).toBe('10.0');
    expect(result.allowance).toBe('100.0');
  });

  it('returns zero spendable balance when allowance is zero', async () => {
    balanceOf.mockResolvedValue(ethers.BigNumber.from('50000000'));
    allowance.mockResolvedValue(ethers.BigNumber.from(0));

    const result = await readErc20AllowanceAndBalance(
      {} as ethers.providers.Provider,
      TOKEN,
      OWNER,
      SPENDER,
      6,
    );

    expect(result.spendableBalance).toBe('0');
    expect(result.allowance).toBe('0.0');
  });
});
