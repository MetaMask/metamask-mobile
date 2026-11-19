import {
  BASE_DEPOSIT_NETWORK,
  BASE_SEPOLIA_DEPOSIT_NETWORK,
} from '../../config/depositEnvironment';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictEntityId,
  PredictHex,
  PredictTimestamp,
} from '../../types';
import {
  DEPOSIT_PLAN_MIN_REMAINING_MS,
  checkDepositPlan,
  type DepositPlanExpectation,
} from './checkDepositPlan';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const DEPOSIT_ADDRESS: PredictHex =
  '0x3b0b371ae3cb08f272b87319684f6518b3b313a0';
const OWN_ACCOUNT: PredictHex = '0x1111111111111111111111111111111111111111';
const USDC = BASE_DEPOSIT_NETWORK.usdc.address;

interface PlanFields {
  chainId: number;
  tokenContract: PredictHex;
  amount: string;
  depositAddress: PredictHex;
  planExpiresAt: string;
}

const PLAN: PlanFields = {
  chainId: 8453,
  tokenContract: USDC,
  amount: '25.50',
  depositAddress: DEPOSIT_ADDRESS,
  planExpiresAt: '2026-11-13T12:15:00.000Z',
};

const deposit = (
  overrides: Partial<PlanFields> = {},
): PredictDepositOperation => {
  const plan = { ...PLAN, ...overrides };
  return {
    operationId: '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e5f' as PredictEntityId,
    status: 'awaiting_transfer',
    amount: plan.amount as PredictAmount,
    chainId: plan.chainId,
    tokenContract: plan.tokenContract,
    depositAddress: plan.depositAddress,
    planExpiresAt: plan.planExpiresAt as PredictTimestamp,
    txHash: null,
    createdAt: '2026-11-13T12:00:00.000Z' as PredictTimestamp,
    next: {
      kind: 'wallet_transfer',
      chainId: plan.chainId,
      tokenContract: plan.tokenContract,
      amount: plan.amount as PredictAmount,
      depositAddress: plan.depositAddress,
      planExpiresAt: plan.planExpiresAt as PredictTimestamp,
    },
  };
};

const expected = (
  overrides: Partial<DepositPlanExpectation> = {},
): DepositPlanExpectation => ({
  amount: '25.50' as PredictAmount,
  network: BASE_DEPOSIT_NETWORK,
  walletAddresses: [OWN_ACCOUNT],
  now: NOW,
  ...overrides,
});

describe('checkDepositPlan', () => {
  it('accepts a plan that matches on every field and answers it', () => {
    expect(checkDepositPlan(deposit(), expected())).toStrictEqual({
      ok: true,
      plan: {
        chainId: 8453,
        tokenContract: USDC,
        amount: '25.50',
        depositAddress: DEPOSIT_ADDRESS,
        planExpiresAt: '2026-11-13T12:15:00.000Z',
      },
    });
  });

  describe('no plan', () => {
    it.each([
      ['wait', { kind: 'wait' }],
      ['done', { kind: 'done' }],
      ['review', { kind: 'review', supportReference: 'abc' }],
      ['nothing', null],
    ] as const)('refuses a deposit whose next step is %s', (_label, next) => {
      expect(
        checkDepositPlan({ ...deposit(), next }, expected()),
      ).toStrictEqual({ ok: false, reason: 'no_plan' });
    });
  });

  describe('amount', () => {
    it('accepts the typed amount written with fewer decimals', () => {
      expect(
        checkDepositPlan(
          deposit({ amount: '25.5' }),
          expected({ amount: '25.50' as PredictAmount }),
        ).ok,
      ).toBe(true);
    });

    it.each(['25.49', '25.51', '255.0', '2.55', '25.501', ''])(
      'refuses a plan amount of %p for a typed $25.50',
      (amount) => {
        expect(checkDepositPlan(deposit({ amount }), expected())).toStrictEqual(
          { ok: false, reason: 'amount' },
        );
      },
    );
  });

  describe('chain', () => {
    it.each([84532, 1, 137, 0])(
      'refuses chain %s when the build expects Base',
      (chainId) => {
        expect(
          checkDepositPlan(deposit({ chainId }), expected()),
        ).toStrictEqual({ ok: false, reason: 'chain' });
      },
    );

    it('accepts Base Sepolia when the build expects it', () => {
      expect(
        checkDepositPlan(
          deposit({
            chainId: 84532,
            tokenContract: BASE_SEPOLIA_DEPOSIT_NETWORK.usdc.address,
          }),
          expected({ network: BASE_SEPOLIA_DEPOSIT_NETWORK }),
        ).ok,
      ).toBe(true);
    });

    it('refuses Base mainnet when the build expects Base Sepolia', () => {
      expect(
        checkDepositPlan(
          deposit(),
          expected({ network: BASE_SEPOLIA_DEPOSIT_NETWORK }),
        ),
      ).toStrictEqual({ ok: false, reason: 'chain' });
    });
  });

  describe('token', () => {
    it('accepts the known USDC in any case', () => {
      expect(
        checkDepositPlan(
          deposit({ tokenContract: USDC.toLowerCase() as PredictHex }),
          expected(),
        ).ok,
      ).toBe(true);
    });

    it.each([
      ['Base Sepolia USDC on Base', BASE_SEPOLIA_DEPOSIT_NETWORK.usdc.address],
      ['another token', '0x50c5725949a6f0c72e6c4a641f24049a917db0cb'],
      ['the deposit address', DEPOSIT_ADDRESS],
    ] as const)('refuses %s', (_label, tokenContract) => {
      expect(
        checkDepositPlan(deposit({ tokenContract }), expected()),
      ).toStrictEqual({ ok: false, reason: 'token' });
    });
  });

  describe('address', () => {
    it('accepts a correctly checksummed address', () => {
      expect(
        checkDepositPlan(
          deposit({
            depositAddress: '0x3b0b371ae3cB08F272b87319684f6518b3b313a0',
          }),
          expected(),
        ).ok,
      ).toBe(true);
    });

    it.each([
      ['too short', '0x3b0b371ae3cb08f272b87319684f6518b3b313'],
      ['too long', `${DEPOSIT_ADDRESS}00`],
      ['not hex', '0x3b0b371ae3cb08f272b87319684f6518b3b313zz'],
      ['badly checksummed', '0x3B0B371ae3cb08f272b87319684f6518b3b313a0'],
    ] as const)('refuses an address that is %s', (_label, depositAddress) => {
      expect(
        checkDepositPlan(
          deposit({ depositAddress: depositAddress as PredictHex }),
          expected(),
        ),
      ).toStrictEqual({ ok: false, reason: 'address' });
    });
  });

  describe('expiry', () => {
    const expiringIn = (ms: number) => new Date(NOW + ms).toISOString();

    it('accepts a plan with just over two minutes left', () => {
      expect(
        checkDepositPlan(
          deposit({
            planExpiresAt: expiringIn(DEPOSIT_PLAN_MIN_REMAINING_MS + 1000),
          }),
          expected(),
        ).ok,
      ).toBe(true);
    });

    it.each([
      ['exactly two minutes left', DEPOSIT_PLAN_MIN_REMAINING_MS],
      ['one minute left', 60_000],
      ['already expired', -1000],
    ])('refuses a plan with %s', (_label, remaining) => {
      expect(
        checkDepositPlan(
          deposit({ planExpiresAt: expiringIn(remaining) }),
          expected(),
        ),
      ).toStrictEqual({ ok: false, reason: 'expiry' });
    });

    it('refuses a deadline that does not parse', () => {
      expect(
        checkDepositPlan(deposit({ planExpiresAt: 'soon' }), expected()),
      ).toStrictEqual({ ok: false, reason: 'expiry' });
    });
  });

  describe('recipient', () => {
    it('refuses the zero address', () => {
      expect(
        checkDepositPlan(
          deposit({
            depositAddress: '0x0000000000000000000000000000000000000000',
          }),
          expected(),
        ),
      ).toStrictEqual({ ok: false, reason: 'recipient_zero' });
    });

    it('refuses the USDC contract itself', () => {
      expect(
        checkDepositPlan(deposit({ depositAddress: USDC }), expected()),
      ).toStrictEqual({ ok: false, reason: 'recipient_token' });
    });

    it('refuses an account in the user wallet, in any case', () => {
      expect(
        checkDepositPlan(
          deposit({ depositAddress: OWN_ACCOUNT }),
          expected({ walletAddresses: [OWN_ACCOUNT.toUpperCase()] }),
        ),
      ).toStrictEqual({ ok: false, reason: 'recipient_own_account' });
    });
  });

  it('reads the Funding Plan step, not the deposit fields beside it', () => {
    const planFor99 = deposit({ amount: '99.00' });

    expect(
      checkDepositPlan(
        { ...planFor99, amount: '25.50' as PredictAmount },
        expected(),
      ),
    ).toStrictEqual({ ok: false, reason: 'amount' });
  });
});
