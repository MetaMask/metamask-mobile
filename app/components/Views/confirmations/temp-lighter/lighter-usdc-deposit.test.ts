import { TransactionType } from '@metamask/transaction-controller';
import { LIGHTER_BRIDGE_CONFIG } from '@metamask/perps-controller/constants/lighterConfig';
import { Hex, decodeFunctionData, parseAbi } from 'viem';

import {
  LIGHTER_PERPS_ROUTE_TYPE,
  LIGHTER_USDC_DEPOSIT_ASSET_INDEX,
  buildLighterUsdcDepositTransaction,
  getLighterUsdcDepositAmountCalls,
  userHasLighterAccount,
} from './lighter-usdc-deposit';

const USER = '0x1111111111111111111111111111111111111111' as Hex;
const { bridgeContract, usdcContract } = LIGHTER_BRIDGE_CONFIG.mainnet;

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount)',
]);
const DEPOSIT_ABI = parseAbi([
  'function deposit(address _to, uint16 _assetIndex, uint8 _routeType, uint256 _amount)',
]);

describe('userHasLighterAccount', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('returns false when Lighter reports the address has no account', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 21100, message: 'account not found' }),
    });

    const hasAccount = await userHasLighterAccount(USER);

    expect(hasAccount).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/accountsByL1Address?l1_address=${USER}`),
    );
  });

  it('returns true when the address has a Lighter sub-account', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        sub_accounts: [{ index: 7, l1_address: USER }],
      }),
    });

    const hasAccount = await userHasLighterAccount(USER);

    expect(hasAccount).toBe(true);
  });

  it('throws when the lookup fails for a reason other than a missing account', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ code: 500, message: 'unavailable' }),
    });

    await expect(userHasLighterAccount(USER)).rejects.toThrow('unavailable');
  });

  it('throws the status when the failure response has no message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: 503 }),
    });

    await expect(userHasLighterAccount(USER)).rejects.toThrow(
      'Lighter account lookup failed (503)',
    );
  });

  it('returns true when the response lists subAccounts', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, subAccounts: [{ index: 1 }] }),
    });

    await expect(userHasLighterAccount(USER)).resolves.toBe(true);
  });

  it('returns false when the account list is not an array', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, sub_accounts: null }),
    });

    await expect(userHasLighterAccount(USER)).resolves.toBe(false);
  });
});

describe('buildLighterUsdcDepositTransaction', () => {
  it('approves mainnet USDC for the Lighter contract and deposits it to perps', () => {
    const built = buildLighterUsdcDepositTransaction(USER, 1_500_000n);

    expect(built.approve.to.toLowerCase()).toBe(usdcContract.toLowerCase());
    expect(built.deposit.to.toLowerCase()).toBe(bridgeContract.toLowerCase());
    expect(built.deposit.data.startsWith('0x8a857083')).toBe(true);
    expect(built.requiredAsset).toStrictEqual({
      address: usdcContract,
      amount: '0x16e360',
      standard: 'erc20',
    });

    expect(
      decodeFunctionData({ abi: ERC20_ABI, data: built.approve.data }),
    ).toStrictEqual({
      functionName: 'approve',
      args: [bridgeContract, 1_500_000n],
    });
    expect(
      decodeFunctionData({ abi: DEPOSIT_ABI, data: built.deposit.data }),
    ).toStrictEqual({
      functionName: 'deposit',
      args: [
        USER,
        LIGHTER_USDC_DEPOSIT_ASSET_INDEX,
        LIGHTER_PERPS_ROUTE_TYPE,
        1_500_000n,
      ],
    });
  });
});

describe('getLighterUsdcDepositAmountCalls', () => {
  it('re-encodes the approve and deposit for the entered USDC amount', () => {
    const placeholder = buildLighterUsdcDepositTransaction(USER, 0n);

    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: USER },
        nestedTransactions: [placeholder.approve, placeholder.deposit],
      } as never,
      '1.5',
    );

    const updated = buildLighterUsdcDepositTransaction(USER, 1_500_000n);
    expect(calls).toStrictEqual([
      { nestedTransactionIndex: 0, transactionData: updated.approve.data },
      { nestedTransactionIndex: 1, transactionData: updated.deposit.data },
    ]);
  });

  it('returns no calls for a deposit without calldata', () => {
    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: USER, to: USER },
      } as never,
      '1.5',
    );

    expect(calls).toStrictEqual([]);
  });

  it('returns undefined when the confirmation is not a Lighter deposit', () => {
    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsDeposit,
        txParams: { from: USER, data: '0xa9059cbb' },
      } as never,
      '1.5',
    );

    expect(calls).toBeUndefined();
  });

  it('returns undefined when the deposit has no from address', () => {
    const placeholder = buildLighterUsdcDepositTransaction(USER, 0n);

    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: {},
        nestedTransactions: [placeholder.approve, placeholder.deposit],
      } as never,
      '1',
    );

    expect(calls).toBeUndefined();
  });

  it('returns an empty list when the amount is negative', () => {
    const placeholder = buildLighterUsdcDepositTransaction(USER, 0n);

    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: USER },
        nestedTransactions: [placeholder.approve, placeholder.deposit],
      } as never,
      '-1',
    );

    expect(calls).toStrictEqual([]);
  });

  it('updates the deposit when the confirmation has no approve call', () => {
    const placeholder = buildLighterUsdcDepositTransaction(USER, 0n);

    const calls = getLighterUsdcDepositAmountCalls(
      {
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: USER },
        nestedTransactions: [placeholder.deposit],
      } as never,
      '1',
    );

    const updated = buildLighterUsdcDepositTransaction(USER, 1_000_000n);
    expect(calls).toStrictEqual([
      { nestedTransactionIndex: 0, transactionData: updated.deposit.data },
    ]);
  });
});
