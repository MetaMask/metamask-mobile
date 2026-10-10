import { ethers } from 'ethers';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { RewardsMoneyClaimRefusalError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  ClaimDto,
  ClaimInitiateDto,
  ClaimVoucherDto,
  EarningsSummaryDto,
  InitiateClaimResult,
  LedgerClaimEntryDto,
  LedgerEarningEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import Engine from '../../../../core/Engine';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { isMonadMainnetChainId } from '../../../../util/networks';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import type { MoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '../../Money/utils/moneyAccountTransactions';
import {
  buildReceiveWithAuthorizationData,
  canClaimEarnings,
  claimRoutesForSummary,
  evmAddressFromEarningAddress,
  claimToastKey,
  isClaimSubmittable,
  isPendingClaimRow,
  mergeInFlightClaims,
  runEarningsClaim,
  submitClaimVoucher,
} from './claimEarnings';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: { findNetworkClientIdByChainId: jest.fn() },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));
jest.mock('../../../../util/transaction-controller', () => ({
  __esModule: true,
  addTransactionBatch: jest.fn(),
}));
jest.mock('../../../../util/networks', () => ({
  isMonadMainnetChainId: jest.fn(),
}));
jest.mock('../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));
jest.mock('../../Money/utils/moneyAccountTransactions', () => ({
  buildMoneyAccountDepositBatch: jest.fn(),
  getMoneyAccountDepositAssetAddress: jest.fn(),
}));

const mockAddTransactionBatch = jest.mocked(addTransactionBatch);
const mockIsMonadMainnetChainId = jest.mocked(isMonadMainnetChainId);
const mockGetProviderByChainId = jest.mocked(getProviderByChainId);
const mockBuildDepositBatch = jest.mocked(buildMoneyAccountDepositBatch);
const mockGetDepositAssetAddress = jest.mocked(
  getMoneyAccountDepositAssetAddress,
);
const mockFindNetworkClientIdByChainId = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);
const mockSubscribe = jest.mocked(Engine.controllerMessenger.subscribe);

const ONE_DOLLAR = '1000000';
const UNDER_DOLLAR = '999999';

const voucher: ClaimVoucherDto = {
  claim_id: 'claim-1',
  from: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  value: ONE_DOLLAR,
  valid_after: 0,
  valid_before: 60,
  nonce: '0x' + '11'.repeat(32),
  signature: '0x' + '22'.repeat(65),
};

const opened = (id = 'claim-1'): ClaimInitiateDto => ({
  claim: { id } as ClaimInitiateDto['claim'],
  voucher,
  excluded: [],
  status: 'OPENED',
});

function summary(options: {
  claimable: string;
  cashback?: string;
  revShare?: string;
}): EarningsSummaryDto {
  return {
    lifetime_total: '0',
    window: null,
    claimable: options.claimable,
    pending: '0',
    claimed: '0',
    voided: '0',
    minimum_musd_base_units: ONE_DOLLAR,
    pairing_pending: false,
    self_earned: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      voided: '0',
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: {
          lifetime: '0',
          claimable: options.cashback,
          pending: '0',
          claimed: '0',
          voided: '0',
          by_address: [],
        },
      },
    },
    earned_by_others: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      voided: '0',
      by_claim_family: {
        REFERRAL_REV_SHARE: {
          lifetime: '0',
          claimable: options.revShare,
          pending: '0',
          claimed: '0',
          voided: '0',
        },
      },
    },
  };
}

describe('claimRoutesForSummary', () => {
  it('posts cashback only when that family is at least $1', () => {
    expect(
      claimRoutesForSummary(
        summary({
          claimable: '2000000',
          cashback: ONE_DOLLAR,
          revShare: ONE_DOLLAR,
        }),
      ),
    ).toEqual(['referral-trade-fee-cashback']);

    expect(
      claimRoutesForSummary(
        summary({
          claimable: ONE_DOLLAR,
          cashback: UNDER_DOLLAR,
          revShare: ONE_DOLLAR,
        }),
      ),
    ).toEqual([]);
  });

  it('leaves the route off when cashback is under $1', () => {
    const split = summary({
      claimable: '1200000',
      cashback: '600000',
      revShare: '600000',
    });
    expect(canClaimEarnings(split, 'REFEREE')).toBe(false);
    expect(claimRoutesForSummary(split)).toEqual([]);
  });

  it('treats exactly $1 of cashback as claimable for a referee', () => {
    const atMinimum = summary({
      claimable: ONE_DOLLAR,
      cashback: ONE_DOLLAR,
      revShare: ONE_DOLLAR,
    });

    expect(claimRoutesForSummary(atMinimum)).toEqual([
      'referral-trade-fee-cashback',
    ]);
    expect(canClaimEarnings(atMinimum, 'REFEREE')).toBe(true);
    expect(canClaimEarnings(atMinimum, 'REFERRER')).toBe(false);
    expect(canClaimEarnings(atMinimum, 'NONE')).toBe(false);
  });
});

describe('isClaimSubmittable', () => {
  const ready = {
    moneyAccountAddress: '0xabc',
    chainId: '0x8f',
    isMonadMainnet: true,
    isSponsored: true,
  };

  it('allows a sponsored Monad money account', () => {
    expect(isClaimSubmittable(ready)).toBe(true);
  });

  it('refuses when the account, chain, or sponsorship is missing', () => {
    expect(
      isClaimSubmittable({ ...ready, moneyAccountAddress: undefined }),
    ).toBe(false);
    expect(isClaimSubmittable({ ...ready, chainId: undefined })).toBe(false);
    expect(isClaimSubmittable({ ...ready, isMonadMainnet: false })).toBe(false);
    expect(isClaimSubmittable({ ...ready, isSponsored: false })).toBe(false);
  });
});

describe('claimToastKey', () => {
  it('uses the partial sentence when a paid claim deferred the rest', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: true,
          opened: true,
          excludedReasons: ['VELOCITY_LIMIT_DEFERRED'],
        },
      ]),
    ).toBe('claimPartialSuccessToast');
  });

  it('uses success when any voucher was submitted', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: true,
          opened: true,
        },
        {
          route: 'referral-rev-share',
          submitted: false,
          opened: false,
          reason: 'UNDER_REVIEW',
        },
      ]),
    ).toBe('claimSuccessToast');
  });

  it('keeps a suspension, a hold, and a void off the retry toast', () => {
    for (const reason of ['SUSPENDED', 'UNDER_REVIEW', 'VOIDED']) {
      expect(
        claimToastKey([
          {
            route: 'referral-trade-fee-cashback',
            submitted: false,
            opened: false,
            reason,
          },
        ]),
      ).toBe('claimFailureToast');
    }
  });

  it('tells a short hourly budget to wait', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: false,
          reason: 'VELOCITY_LIMIT_EXCEEDED',
        },
      ]),
    ).toBe('claimFailureWaitToast');
  });

  it('tells a rate limit and a lapse cooldown to wait', () => {
    for (const reason of ['RATE_LIMITED', 'CLAIM_COOLDOWN']) {
      expect(
        claimToastKey([
          {
            route: 'referral-trade-fee-cashback',
            submitted: false,
            opened: false,
            reason,
          },
        ]),
      ).toBe('claimFailureWaitToast');
    }
  });

  it('picks the actionable sentence when the routes disagree', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: false,
          reason: 'UNDER_REVIEW',
        },
        {
          route: 'referral-rev-share',
          submitted: false,
          opened: false,
          reason: 'AWAITING_RELEASE',
        },
      ]),
    ).toBe('claimFailureWaitToast');

    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: false,
          reason: 'BELOW_MINIMUM',
        },
      ]),
    ).toBe('claimFailureMinimumToast');
  });

  it('uses the retry sentence when the batch never submits', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: true,
          reason: 'BATCH_NOT_SUBMITTED',
        },
      ]),
    ).toBe('claimFailureRetryToast');
  });

  it('uses the retry sentence when login keys are unavailable', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: false,
          reason: 'JWKS_UNAVAILABLE',
        },
      ]),
    ).toBe('claimFailureRetryToast');
  });

  it.each([
    ['NO_ELIGIBLE_BALANCE', 'claimFailureNoEligibleBalanceToast'],
    ['EARNING_ADDRESS_UNSCREENABLE', 'claimFailureUnavailableToast'],
    ['EARNING_ADDRESS_MISSING', 'claimFailureContactSupportToast'],
    ['TAX_DETERMINATION_REQUIRED', 'claimFailureUnavailableToast'],
  ] as const)(
    'uses the %s sentence when the claim pays nothing',
    (reason, toast) => {
      expect(
        claimToastKey([
          {
            route: 'referral-trade-fee-cashback',
            submitted: false,
            opened: false,
            reason,
          },
        ]),
      ).toBe(toast);
    },
  );

  it('uses the too-large sentence when a day cannot fit any claim', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: false,
          opened: false,
          reason: 'CLAIM_TOO_LARGE',
        },
      ]),
    ).toBe('claimFailureTooLargeToast');
  });

  it('uses the partial sentence before the too-large one when both groups were left', () => {
    expect(
      claimToastKey([
        {
          route: 'referral-trade-fee-cashback',
          submitted: true,
          opened: true,
          excludedReasons: ['CLAIM_TOO_LARGE', 'VELOCITY_LIMIT_DEFERRED'],
        },
      ]),
    ).toBe('claimPartialSuccessToast');
  });

  it('uses success when a paid claim also left an unpayable group', () => {
    for (const reason of [
      'CLAIM_TOO_LARGE',
      'EARNING_ADDRESS_MISSING',
      'EARNING_ADDRESS_UNSCREENABLE',
      'TAX_DETERMINATION_REQUIRED',
    ]) {
      expect(
        claimToastKey([
          {
            route: 'referral-trade-fee-cashback',
            submitted: true,
            opened: true,
            excludedReasons: [reason],
          },
        ]),
      ).toBe('claimSuccessToast');
    }
  });
});

describe('evmAddressFromEarningAddress', () => {
  it('reads the address after the first colon', () => {
    expect(
      evmAddressFromEarningAddress(
        'eip155:0x1111111111111111111111111111111111111111',
      ),
    ).toBe('0x1111111111111111111111111111111111111111');
  });

  it('does not strip a chain reference that slipped into the key', () => {
    expect(
      evmAddressFromEarningAddress(
        'eip155:1:0x1111111111111111111111111111111111111111',
      ),
    ).toBeNull();
  });

  it('returns null for a non-EVM namespace or a missing address', () => {
    expect(evmAddressFromEarningAddress('bip122:bc1qabc')).toBeNull();
    expect(evmAddressFromEarningAddress('eip155:')).toBeNull();
    expect(evmAddressFromEarningAddress('not-caip')).toBeNull();
  });
});

describe('runEarningsClaim', () => {
  it('signs a 428 and retries the same route with the proofs', async () => {
    const calls: unknown[] = [];
    const initiateClaim = jest.fn(
      async (_route, body): Promise<InitiateClaimResult> => {
        calls.push(body);
        if (!body.claim_intent_id) {
          return {
            kind: 'proof_required',
            body: {
              reason: 'PROOF_REQUIRED',
              claim_intent_id: 'intent-1',
              expires_at: '2026-09-29T00:00:00.000Z',
              challenges: [
                {
                  earning_address: 'eip155:0xabc',
                  amount_musd_base_units: ONE_DOLLAR,
                  message: 'sign me',
                },
              ],
            },
          };
        }
        return { kind: 'authorized', body: opened() };
      },
    );
    const signMessage = jest.fn().mockResolvedValue('0xsig');
    const submitVoucher = jest.fn().mockResolvedValue(undefined);

    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim,
      canSignEarningAddress: () => true,
      signMessage,
      submitVoucher,
    });

    expect(signMessage).toHaveBeenCalledWith('sign me', 'eip155:0xabc');
    expect(calls[1]).toEqual({
      money_account_address: '0xmoney',
      claim_intent_id: 'intent-1',
      proofs: [{ earning_address: 'eip155:0xabc', signature: '0xsig' }],
    });
    expect(submitVoucher).toHaveBeenCalledWith(voucher);
    expect(outcomes).toEqual([
      {
        route: 'referral-trade-fee-cashback',
        submitted: true,
        opened: true,
      },
    ]);
  });

  it('keeps a deferred group on a claim that paid in part', async () => {
    const partial = opened();
    partial.excluded = [
      { type: 'SWAPS_FEE_CASHBACK', reason: 'VELOCITY_LIMIT_DEFERRED' },
    ];

    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim: async () => ({ kind: 'authorized', body: partial }),
      canSignEarningAddress: () => true,
      signMessage: jest.fn(),
      submitVoucher: jest.fn().mockResolvedValue(undefined),
    });

    expect(outcomes).toEqual([
      {
        route: 'referral-trade-fee-cashback',
        submitted: true,
        opened: true,
        excludedReasons: ['VELOCITY_LIMIT_DEFERRED'],
      },
    ]);
    expect(claimToastKey(outcomes)).toBe('claimPartialSuccessToast');
  });

  it('re-requests only the addresses this device can sign', async () => {
    const calls: unknown[] = [];
    const initiateClaim = jest.fn(
      async (_route, body): Promise<InitiateClaimResult> => {
        calls.push(body);
        if (body.proofs) {
          return { kind: 'authorized', body: opened() };
        }
        if (body.earning_addresses) {
          return {
            kind: 'proof_required',
            body: {
              reason: 'PROOF_REQUIRED',
              claim_intent_id: 'intent-narrow',
              expires_at: '2026-09-29T00:00:00.000Z',
              challenges: [
                {
                  earning_address: 'eip155:0xabc',
                  amount_musd_base_units: ONE_DOLLAR,
                  message: 'sign the evm one',
                },
              ],
            },
          };
        }
        return {
          kind: 'proof_required',
          body: {
            reason: 'PROOF_REQUIRED',
            claim_intent_id: 'intent-all',
            expires_at: '2026-09-29T00:00:00.000Z',
            challenges: [
              {
                earning_address: 'eip155:0xabc',
                amount_musd_base_units: ONE_DOLLAR,
                message: 'sign everything',
              },
              {
                earning_address: 'solana:not-on-this-phone',
                amount_musd_base_units: ONE_DOLLAR,
                message: 'cannot sign',
              },
            ],
          },
        };
      },
    );
    const signMessage = jest.fn().mockResolvedValue('0xsig');

    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim,
      canSignEarningAddress: (earningAddress) =>
        earningAddress === 'eip155:0xabc',
      signMessage,
      submitVoucher: jest.fn().mockResolvedValue(undefined),
    });

    expect(calls[0]).toEqual({ money_account_address: '0xmoney' });
    expect(calls[1]).toEqual({
      money_account_address: '0xmoney',
      earning_addresses: ['eip155:0xabc'],
    });
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(signMessage).toHaveBeenCalledWith(
      'sign the evm one',
      'eip155:0xabc',
    );
    expect(calls[2]).toEqual({
      money_account_address: '0xmoney',
      earning_addresses: ['eip155:0xabc'],
      claim_intent_id: 'intent-narrow',
      proofs: [{ earning_address: 'eip155:0xabc', signature: '0xsig' }],
    });
    expect(outcomes[0]).toMatchObject({ submitted: true, opened: true });
  });

  it('fails the claim when this device can sign none of the challenges', async () => {
    const initiateClaim = jest.fn(
      async (): Promise<InitiateClaimResult> => ({
        kind: 'proof_required',
        body: {
          reason: 'PROOF_REQUIRED',
          claim_intent_id: 'intent-all',
          expires_at: '2026-09-29T00:00:00.000Z',
          challenges: [
            {
              earning_address: 'solana:not-on-this-phone',
              amount_musd_base_units: ONE_DOLLAR,
              message: 'cannot sign',
            },
          ],
        },
      }),
    );
    const signMessage = jest.fn();

    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim,
      canSignEarningAddress: () => false,
      signMessage,
      submitVoucher: jest.fn(),
    });

    expect(initiateClaim).toHaveBeenCalledTimes(1);
    expect(signMessage).not.toHaveBeenCalled();
    expect(outcomes[0]).toMatchObject({
      submitted: false,
      opened: false,
      reason: 'SIGN_FAILED',
    });
  });

  it('refuses a short hourly budget before any signature', async () => {
    const signMessage = jest.fn();
    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim: async () => {
        throw new RewardsMoneyClaimRefusalError(409, 'VELOCITY_LIMIT_EXCEEDED');
      },
      canSignEarningAddress: () => true,
      signMessage,
      submitVoucher: jest.fn(),
    });

    expect(signMessage).not.toHaveBeenCalled();
    expect(outcomes[0]).toMatchObject({
      submitted: false,
      opened: false,
      reason: 'VELOCITY_LIMIT_EXCEEDED',
    });
    expect(claimToastKey(outcomes)).toBe('claimFailureWaitToast');
  });

  it('records a refusal without submitting', async () => {
    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-rev-share'],
      initiateClaim: async () => {
        throw new RewardsMoneyClaimRefusalError(422, 'UNDER_REVIEW');
      },
      canSignEarningAddress: () => true,
      signMessage: jest.fn(),
      submitVoucher: jest.fn(),
    });

    expect(outcomes[0]).toMatchObject({
      submitted: false,
      opened: false,
      reason: 'UNDER_REVIEW',
      retryAfterSeconds: undefined,
    });
    expect(claimToastKey(outcomes)).toBe('claimFailureToast');
  });

  it('keeps Retry-After on a rate-limited refusal', async () => {
    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim: async () => {
        throw new RewardsMoneyClaimRefusalError(429, 'RATE_LIMITED', 240);
      },
      canSignEarningAddress: () => true,
      signMessage: jest.fn(),
      submitVoucher: jest.fn(),
    });

    expect(outcomes[0]).toMatchObject({
      reason: 'RATE_LIMITED',
      retryAfterSeconds: 240,
    });
    expect(claimToastKey(outcomes)).toBe('claimFailureWaitToast');
  });

  it('leaves an opened claim pending when the batch is not sent', async () => {
    const outcomes = await runEarningsClaim({
      moneyAccountAddress: '0xmoney',
      routes: ['referral-trade-fee-cashback'],
      initiateClaim: async () => ({ kind: 'authorized', body: opened() }),
      canSignEarningAddress: () => true,
      signMessage: jest.fn(),
      submitVoucher: async () => {
        throw new Error('rejected');
      },
    });

    expect(outcomes).toEqual([
      {
        route: 'referral-trade-fee-cashback',
        submitted: false,
        opened: true,
        reason: 'BATCH_NOT_SUBMITTED',
      },
    ]);
    expect(claimToastKey(outcomes)).toBe('claimFailureRetryToast');
  });
});

describe('buildReceiveWithAuthorizationData', () => {
  it('encodes the voucher as an EIP-3009 receiveWithAuthorization call', () => {
    const data = buildReceiveWithAuthorizationData(voucher);
    const iface = new ethers.utils.Interface([
      'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
    ]);
    const decoded = iface.decodeFunctionData('receiveWithAuthorization', data);

    expect(data.startsWith(iface.getSighash('receiveWithAuthorization'))).toBe(
      true,
    );
    expect(decoded.from).toBe(voucher.from);
    expect(decoded.to).toBe(voucher.to);
    expect(decoded.value.toString()).toBe(voucher.value);
    expect(decoded.validAfter.toNumber()).toBe(voucher.valid_after);
    expect(decoded.validBefore.toNumber()).toBe(voucher.valid_before);
    expect(decoded.nonce).toBe(voucher.nonce);
    expect(decoded.signature).toBe(voucher.signature);
  });
});

describe('submitClaimVoucher', () => {
  const MUSD = '0x3333333333333333333333333333333333333333' as Hex;
  const vaultConfig: MoneyAccountVaultConfig = {
    chainId: '0x8f',
    boringVault: '0x4444444444444444444444444444444444444444',
    tellerAddress: '0x5555555555555555555555555555555555555555',
    accountantAddress: '0x6666666666666666666666666666666666666666',
    lensAddress: '0x7777777777777777777777777777777777777777',
  };
  const approveTx = {
    params: { to: MUSD, data: '0xapprove' as Hex, value: '0x0' as Hex },
    type: TransactionType.tokenMethodApprove,
  };
  const depositTx = {
    params: {
      to: vaultConfig.tellerAddress as Hex,
      data: '0xdeposit' as Hex,
      value: '0x0' as Hex,
    },
    type: TransactionType.moneyAccountDeposit,
  };
  const provider = {} as ethers.providers.Web3Provider;

  let onConfirmed: ((meta: { batchId?: string }) => void) | undefined;
  let onFailed:
    | ((payload: {
        error: string;
        transactionMeta: { batchId?: string };
      }) => void)
    | undefined;

  const submitLive = (
    overrides: Partial<Parameters<typeof submitClaimVoucher>[0]> = {},
  ) =>
    submitClaimVoucher({
      voucher,
      vaultConfig,
      moneyAccountAddress: voucher.to,
      now: () => 0,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    onConfirmed = undefined;
    onFailed = undefined;
    mockGetProviderByChainId.mockReturnValue(provider);
    mockGetDepositAssetAddress.mockReturnValue(MUSD);
    mockBuildDepositBatch.mockResolvedValue({ approveTx, depositTx });
    mockFindNetworkClientIdByChainId.mockReturnValue('monad-mainnet');
    mockIsMonadMainnetChainId.mockReturnValue(true);
    mockSubscribe.mockImplementation((event, handler) => {
      if (String(event).endsWith('transactionConfirmed')) {
        onConfirmed = handler as typeof onConfirmed;
      }
      if (String(event).endsWith('transactionFailed')) {
        onFailed = handler as typeof onFailed;
      }
    });
    mockAddTransactionBatch.mockImplementation(async (request) => {
      const batchId = request.batchId;
      if (!batchId) {
        throw new Error('batchId is required');
      }
      onConfirmed?.({ batchId });
      return { batchId };
    });
  });

  it('submits the voucher, approve, and deposit as one sponsored batch', async () => {
    await submitLive();

    expect(mockBuildDepositBatch).toHaveBeenCalledWith({
      amount: BigInt(voucher.value),
      chainId: '0x8f',
      boringVault: vaultConfig.boringVault,
      tellerAddress: vaultConfig.tellerAddress,
      accountantAddress: vaultConfig.accountantAddress,
      lensAddress: vaultConfig.lensAddress,
      provider,
    });
    expect(mockAddTransactionBatch).toHaveBeenCalledTimes(1);

    const request = mockAddTransactionBatch.mock.calls[0][0];
    expect(request).toMatchObject({
      disableHook: true,
      disableSequential: true,
      disableUpgrade: true,
      from: voucher.to,
      requireApproval: false,
      isGasFeeSponsored: true,
      isInternal: true,
      networkClientId: 'monad-mainnet',
      origin: ORIGIN_METAMASK,
      skipInitialGasEstimate: true,
    });
    expect(request.batchId).toMatch(/^0x[0-9a-f]{32}$/u);
    expect(request.transactions).toEqual([
      {
        params: {
          to: MUSD,
          data: buildReceiveWithAuthorizationData(voucher),
          value: '0x0',
        },
        type: TransactionType.contractInteraction,
      },
      approveTx,
      { ...depositTx, type: TransactionType.contractInteraction },
    ]);
  });

  it('does not sponsor gas off Monad mainnet', async () => {
    mockIsMonadMainnetChainId.mockReturnValue(false);

    await submitLive();

    expect(mockAddTransactionBatch.mock.calls[0][0]).toMatchObject({
      isGasFeeSponsored: false,
    });
  });

  it('throws before building a batch when the chain has no provider', async () => {
    mockGetProviderByChainId.mockReturnValue(
      undefined as unknown as ReturnType<typeof getProviderByChainId>,
    );

    await expect(submitLive()).rejects.toThrow(
      'No provider available for chain 0x8f',
    );
    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('throws before submitting when the chain has no network client', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue(
      undefined as unknown as string,
    );

    await expect(submitLive()).rejects.toThrow(
      'Network client not found for chain 0x8f',
    );
    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('propagates a batch rejection so the claim stays pending', async () => {
    mockAddTransactionBatch.mockRejectedValue(new Error('User rejected'));

    await expect(submitLive()).rejects.toThrow('User rejected');
  });

  it('throws before building a batch when the voucher has expired', async () => {
    await expect(submitLive({ now: () => 60_000 })).rejects.toThrow(
      'VOUCHER_EXPIRED',
    );

    expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('throws before submitting when the voucher expires while the batch is built', async () => {
    let built = false;
    mockBuildDepositBatch.mockImplementation(async () => {
      built = true;
      return { approveTx, depositTx };
    });

    await expect(
      submitLive({ now: () => (built ? 60_000 : 0) }),
    ).rejects.toThrow('VOUCHER_EXPIRED');

    expect(mockAddTransactionBatch).not.toHaveBeenCalled();
  });

  it('rejects when the batch reverts instead of reporting success', async () => {
    mockAddTransactionBatch.mockImplementation(async (request) => {
      const batchId = request.batchId;
      if (!batchId) {
        throw new Error('batchId is required');
      }
      onFailed?.({
        error: 'reverted',
        transactionMeta: { batchId },
      });
      return { batchId };
    });

    await expect(submitLive()).rejects.toThrow('reverted');
  });

  it('rejects when the batch is still unconfirmed after the voucher window', async () => {
    jest.useFakeTimers();
    mockAddTransactionBatch.mockImplementation(async (request) => {
      const batchId = request.batchId;
      if (!batchId) {
        throw new Error('batchId is required');
      }
      return { batchId };
    });

    try {
      const pending = submitLive();
      const swallowed = pending.catch(() => undefined);
      await jest.advanceTimersByTimeAsync(90_000);
      await swallowed;
      await expect(pending).rejects.toThrow('CONFIRMATION_TIMEOUT');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('mergeInFlightClaims', () => {
  const earning: LedgerEarningEntryDto = {
    type: 'earning',
    id: 'earn-1',
    earning_origin_type: 'SWAPS_FEE_CASHBACK',
    musd_amount: '1000000',
    fee_amount_usd: '1',
    entry_count: 1,
    transaction_hash: null,
    chain_id: null,
    ledger_timestamp: '2026-09-01T00:00:00.000Z',
    claim_status: 'unclaimed',
    voided_musd_amount: '0',
    claimable_at: '2026-09-02T00:00:00.000Z',
    swaps_source: null,
    perps_source: null,
    predict_source: null,
  };

  const settled: LedgerClaimEntryDto = {
    type: 'claim',
    id: 'claim-settled',
    route: 'REFERRAL_TRADE_FEE_CASHBACK',
    gross_amount: '1000000',
    net_amount: '1000000',
    withholding_rate_bps: 0,
    status: 'SETTLED',
    ledger_timestamp: '2026-09-02T00:00:00.000Z',
    settled_at: '2026-09-02T00:00:00.000Z',
    payout_method: 'VOUCHER',
  };

  function claim(overrides: Partial<ClaimDto>): ClaimDto {
    return {
      id: 'claim-open',
      beneficiary_profile_id: 'profile',
      money_account_address: '0xabc',
      earning_origin_types: ['SWAPS_FEE_CASHBACK'],
      gross_amount: '2500000',
      withheld_amount: '0',
      net_amount: '2500000',
      withholding_rate_bps: 0,
      nonce: '0x01',
      signature: '0x02',
      valid_before: null,
      settled_block: null,
      settled_tx_hash: null,
      settled_at: null,
      released_at: null,
      status: 'AUTHORIZED',
      route: 'REFERRAL_TRADE_FEE_CASHBACK',
      payout_method: 'VOUCHER',
      created_at: '2026-09-03T00:00:00.000Z',
      updated_at: '2026-09-03T00:00:00.000Z',
      ...overrides,
    };
  }

  it('prepends an authorized voucher and skips manual and settled rows', () => {
    const merged = mergeInFlightClaims(
      [earning, settled],
      [
        claim({ id: 'claim-open', status: 'AUTHORIZED' }),
        claim({ id: 'claim-signing', status: 'PENDING_SIGNATURE' }),
        claim({ id: 'claim-settled', status: 'AUTHORIZED' }),
        claim({ id: 'claim-manual', payout_method: 'MANUAL' }),
        claim({ id: 'claim-done', status: 'SETTLED' }),
      ],
    );

    expect(merged?.map((item) => item.id)).toEqual([
      'claim-open',
      'claim-signing',
      'earn-1',
      'claim-settled',
    ]);
  });

  it('builds a pending row from the claim id and net amount', () => {
    const merged = mergeInFlightClaims([], [claim({ net_amount: '42' })]);

    expect(merged).toEqual([
      { kind: 'pending-claim', id: 'claim-open', net_amount: '42' },
    ]);
  });

  it('returns the ledger untouched when nothing is in flight', () => {
    expect(mergeInFlightClaims([earning, settled], [])).toEqual([
      earning,
      settled,
    ]);
  });

  it('returns null while the ledger page is still loading', () => {
    expect(mergeInFlightClaims(null, [claim({})])).toBeNull();
  });
});

describe('isPendingClaimRow', () => {
  it('tells a pending claim row apart from ledger entries', () => {
    expect(
      isPendingClaimRow({ kind: 'pending-claim', id: 'c', net_amount: '1' }),
    ).toBe(true);
    expect(
      isPendingClaimRow({
        type: 'claim',
        id: 'claim-settled',
        route: 'REFERRAL_TRADE_FEE_CASHBACK',
        gross_amount: '1',
        net_amount: '1',
        withholding_rate_bps: 0,
        status: 'SETTLED',
        ledger_timestamp: '2026-09-02T00:00:00.000Z',
        settled_at: '2026-09-02T00:00:00.000Z',
        payout_method: 'VOUCHER',
      }),
    ).toBe(false);
  });
});
