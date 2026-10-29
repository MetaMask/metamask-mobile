/**
 * The Earnings tab mocks this hook. The behavior here is which banner is
 * queued, challenge signing, and that a claim does not navigate, rather than
 * rendered screen state. A component-view test cannot drive the voucher batch
 * without mocking this hook, so this stays a hook unit test.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import type { Action } from '@reduxjs/toolkit';
import { KeyringTypes } from '@metamask/keyring-controller';
import { BtcAccountType, BtcScope } from '@metamask/keyring-api';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import {
  setClaimLock,
  setClaimWaitingUntil,
  type ClaimLock,
} from '../../../../reducers/rewardsMoney';
import {
  selectClaimLock,
  selectClaimWaitingUntil,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectMoneyAccountVaultConfig,
  type MoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import { isMonadMainnetChainId } from '../../../../util/networks';
import { RewardsMoneyClaimRefusalError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  ClaimVoucherDto,
  EarningsSummaryDto,
  InitiateClaimBody,
  InitiateClaimResult,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import useRewardsToast from './useRewardsToast';
import {
  ClaimBatchConfirmationError,
  submitClaimVoucher,
} from '../utils/claimEarnings';
import {
  claimRewardsNotification,
  clearSettledClaimBatchBanners,
  queueClaimRewardsInPlaceOfSettledBanner,
  suppressSettledClaimBatchBanner,
} from '../utils/claimBatchNotifications';
import { useClaimEarnings } from './useClaimEarnings';

const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
let storedClaimWait: number | undefined;
let storedClaimLock: ClaimLock | undefined;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../reducers/rewardsMoney/selectors', () => ({
  selectReferralMeLocalizedText: jest.fn(),
  selectClaimWaitingUntil: jest.fn(),
  selectClaimLock: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/gasFeesSponsored',
  () => ({
    getGasFeesSponsoredNetworkEnabled: jest.fn(),
  }),
);

jest.mock('../../../../util/networks', () => ({
  isMonadMainnetChainId: jest.fn(() => true),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
  context: {
    AccountsController: {
      getAccountByAddress: jest.fn(),
    },
    KeyringController: {
      signPersonalMessage: jest.fn(),
      withKeyringV2: jest.fn(),
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0x1111111111111111111111111111111111111111'],
          },
        ],
      },
    },
  },
}));

jest.mock('@metamask/eth-snap-keyring/v2', () => ({
  isSnapKeyring: (keyring: { submitRequest?: unknown }) =>
    typeof keyring?.submitRequest === 'function',
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../utils/claimBatchNotifications', () => ({
  queueClaimRewardsInPlaceOfSettledBanner: jest.fn((show: () => void) => {
    show();
    return 0;
  }),
  claimRewardsNotification: jest.fn((id: string, title: string) => ({
    type: 'CLAIM_REWARDS',
    id,
    title,
  })),
  suppressSettledClaimBatchBanner: jest.fn(),
  clearSettledClaimBatchBanners: jest.fn(() => [
    { type: 'REMOVE_NOTIFICATION_BY_ID', id: 'tx-1' },
  ]),
}));

jest.mock('../utils/claimEarnings', () => {
  const actual = jest.requireActual('../utils/claimEarnings');
  return {
    ...actual,
    submitClaimVoucher: jest.fn(),
  };
});

const PROFILE_ID = 'profile-a';
const MONEY_ACCOUNT = '0x2222222222222222222222222222222222222222';
const EARNING_ADDRESS = 'eip155:0x1111111111111111111111111111111111111111';
const ONE_DOLLAR = '1000000';
const UNDER_DOLLAR = '999999';

const localizedText = {
  claimSuccessToast: 'Earnings successfully claimed',
  claimPartialSuccessToast:
    'Part of mUSD successfully claimed to your Money account. You may try to claim the rest later.',
  claimFailureToast: 'Earnings could not be claimed',
  claimFailureRetryToast: 'Try again',
  claimFailureWaitToast: 'Try again shortly',
  claimFailureWaitMinutesToast:
    "You can't claim just yet. Try again in {minutes} minutes.",
  claimFailureMinimumToast: 'Earn at least $1',
  claimFailureAddressBlockedToast: 'Address blocked',
  claimFailureTooLargeToast:
    'This amount is too large to claim in the app right now. Please contact support.',
  claimFailureNoEligibleBalanceToast:
    "There's nothing ready to claim right now.",
  claimFailureUnavailableToast:
    "These earnings can't be claimed right now. They stay in your balance.",
  claimFailureContactSupportToast:
    "These earnings can't be claimed right now. They stay in your balance. Please contact support.",
} as ReferralLocalizedText;

const vaultConfig = {
  chainId: '0x8f',
  boringVault: '0x4444444444444444444444444444444444444444',
  tellerAddress: '0x5555555555555555555555555555555555555555',
  accountantAddress: '0x6666666666666666666666666666666666666666',
  lensAddress: '0x7777777777777777777777777777777777777777',
} as MoneyAccountVaultConfig;

const voucher: ClaimVoucherDto = {
  claim_id: 'claim-1',
  from: '0x1111111111111111111111111111111111111111',
  to: MONEY_ACCOUNT,
  value: ONE_DOLLAR,
  valid_after: 0,
  valid_before: 60,
  nonce: '0x' + '11'.repeat(32),
  signature: '0x' + '22'.repeat(65),
};

const authorized = (): InitiateClaimResult => ({
  kind: 'authorized',
  body: {
    claim: { id: 'claim-1' } as InitiateClaimResult extends {
      kind: 'authorized';
    }
      ? never
      : never,
    voucher,
    excluded: [],
    status: 'OPENED',
  },
});

function summary(claimable: string): EarningsSummaryDto {
  return {
    lifetime_total: '0',
    window: null,
    claimable,
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
          claimable,
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
      by_claim_family: {},
    },
  };
}

describe('useClaimEarnings', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockSignPersonalMessage = Engine.context.KeyringController
    .signPersonalMessage as jest.Mock;
  const mockShowToast = jest.fn();
  const mockSuccessToast = jest.fn((title: string) => ({
    variant: 'success',
    title,
  }));
  const mockErrorToast = jest.fn((title: string) => ({
    variant: 'error',
    title,
  }));
  const mockSubmitClaimVoucher = jest.mocked(submitClaimVoucher);
  const onOpened = jest.fn();
  const onSubmitted = jest.fn();
  const onClaimsPaused = jest.fn();

  beforeEach(() => {
    storedClaimWait = undefined;
    storedClaimLock = undefined;
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action: Action) => {
      if (setClaimWaitingUntil.match(action)) {
        storedClaimWait =
          action.payload.until === null ? undefined : action.payload.until;
      }
      if (setClaimLock.match(action)) {
        storedClaimLock = action.payload.lock ?? undefined;
      }
    });
    jest
      .mocked(selectClaimWaitingUntil)
      .mockImplementation(() => storedClaimWait);
    jest.mocked(selectClaimLock).mockImplementation(() => storedClaimLock);
    onOpened.mockReset();
    onSubmitted.mockReset();
    onClaimsPaused.mockReset();
    (selectReferralMeLocalizedText as jest.Mock).mockReturnValue(localizedText);
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT,
    });
    (selectMoneyAccountVaultConfig as unknown as jest.Mock).mockReturnValue(
      vaultConfig,
    );
    (getGasFeesSponsoredNetworkEnabled as unknown as jest.Mock).mockReturnValue(
      () => true,
    );
    jest.mocked(isMonadMainnetChainId).mockReturnValue(true);
    (useRewardsToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      RewardsToastOptions: {
        success: mockSuccessToast,
        error: mockErrorToast,
      },
    });
    mockEngineCall.mockResolvedValue(authorized());
    mockSignPersonalMessage.mockResolvedValue('0xsig');
    (
      Engine.context.AccountsController.getAccountByAddress as jest.Mock
    ).mockReset();
    (Engine.context.KeyringController.withKeyringV2 as jest.Mock).mockReset();
    mockTrackEvent.mockClear();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
    mockSubmitClaimVoucher.mockImplementation(async (request) => {
      request.onBatchSubmitted?.('0xbatch');
    });
  });

  function expectClaimMetric(
    event: { category: string },
    properties: Record<string, unknown>,
  ) {
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const tracked = mockTrackEvent.mock.calls[0][0] as {
      name: string;
      properties: { duration_ms: number };
    };
    expect(tracked.name).toBe(event.category);
    expect(tracked.properties).toEqual(expect.objectContaining(properties));
    expect(tracked.properties.duration_ms).toEqual(expect.any(Number));
    expect(tracked.properties.duration_ms).toBeGreaterThanOrEqual(0);
  }

  function renderClaim(persona: 'referee' | 'referrer' = 'referee') {
    return renderHook(() =>
      useClaimEarnings(PROFILE_ID, {
        persona,
        onOpened,
        onSubmitted,
        onClaimsPaused,
      }),
    );
  }

  it('leaves the claim unsent for a referrer', async () => {
    const { result } = renderClaim('referrer');

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('leaves the claim unsent when the summary is under $1', async () => {
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(UNDER_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(result.current.isClaiming).toBe(false);
  });

  it('leaves the claim unsent when localized copy is missing', async () => {
    (selectReferralMeLocalizedText as jest.Mock).mockReturnValue(undefined);
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('shows the generic failure toast and does not open a claim when there is no money account', async () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureToast,
    );
    expect(result.current.isClaiming).toBe(false);
    expectClaimMetric(MetaMetricsEvents.REWARDS_MONEY_CLAIM_FAILED, {
      claim_type: 'cashback',
      failure_reason: 'not_submittable',
    });
  });

  it('does not open a claim when gas sponsorship is off', async () => {
    (getGasFeesSponsoredNetworkEnabled as unknown as jest.Mock).mockReturnValue(
      () => false,
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureToast,
    );
  });

  it('does not open a claim when the vault chain is not Monad', async () => {
    jest.mocked(isMonadMainnetChainId).mockReturnValue(false);
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureToast,
    );
  });

  it('submits the voucher and shows the success toast', async () => {
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:initiateClaim',
      'referral-trade-fee-cashback',
      { money_account_address: MONEY_ACCOUNT },
    );
    expect(mockSubmitClaimVoucher).toHaveBeenCalledWith({
      voucher,
      vaultConfig,
      moneyAccountAddress: MONEY_ACCOUNT,
      onBatchSubmitted: expect.any(Function),
    });
    expect(suppressSettledClaimBatchBanner).toHaveBeenCalledWith('0xbatch');
    expect(clearSettledClaimBatchBanners).toHaveBeenCalledWith('0xbatch');
    expect(queueClaimRewardsInPlaceOfSettledBanner).toHaveBeenCalledTimes(1);
    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(result.current.isClaiming).toBe(false);
    expectClaimMetric(MetaMetricsEvents.REWARDS_MONEY_CLAIM_COMPLETED, {
      claim_type: 'cashback',
      partial: false,
    });
  });

  it('shows the partial toast when the claim deferred the rest', async () => {
    mockEngineCall.mockResolvedValue({
      kind: 'authorized',
      body: {
        ...authorized().body,
        excluded: [
          { type: 'SWAPS_FEE_CASHBACK', reason: 'VELOCITY_LIMIT_DEFERRED' },
        ],
      },
    });
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimPartialSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('keeps Claim disabled until the summary refresh settles', async () => {
    let releaseRefresh: () => void = () => undefined;
    onSubmitted.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      }),
    );
    const { result } = renderClaim();
    let claimPromise: Promise<void> = Promise.resolve();

    await act(async () => {
      claimPromise = result.current.claim(summary(ONE_DOLLAR));
      while (onSubmitted.mock.calls.length === 0) {
        await Promise.resolve();
      }
    });

    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(result.current.isClaiming).toBe(true);

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseRefresh();
      await claimPromise;
    });

    expect(result.current.isClaiming).toBe(false);
  });

  it('keeps Claim disabled when the summary refresh fails', async () => {
    const stale = summary(ONE_DOLLAR);
    onSubmitted.mockRejectedValue(new Error('network'));
    const { result, rerender } = renderHook(
      ({ current }: { current: EarningsSummaryDto }) =>
        useClaimEarnings(PROFILE_ID, {
          persona: 'referee',
          onOpened,
          onSubmitted,
          summary: current,
        }),
      { initialProps: { current: stale } },
    );

    await act(async () => {
      await result.current.claim(stale);
    });

    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
    expect(result.current.isClaiming).toBe(true);

    mockEngineCall.mockClear();
    await act(async () => {
      await result.current.claim(stale);
    });
    expect(mockEngineCall).not.toHaveBeenCalled();

    rerender({ current: { ...stale } });
    expect(result.current.isClaiming).toBe(true);

    rerender({ current: summary('0') });

    expect(result.current.isClaiming).toBe(false);
  });

  it('keeps Claim disabled after the tab remounts when the summary refresh failed', async () => {
    const stale = summary(ONE_DOLLAR);
    onSubmitted.mockRejectedValue(new Error('network'));
    const mount = (current: EarningsSummaryDto) =>
      renderHook(
        ({ live }: { live: EarningsSummaryDto }) =>
          useClaimEarnings(PROFILE_ID, {
            persona: 'referee',
            onOpened,
            onSubmitted,
            summary: live,
          }),
        { initialProps: { live: current } },
      );
    const first = mount(stale);

    await act(async () => {
      await first.result.current.claim(stale);
    });
    first.unmount();

    const second = mount({ ...stale });

    expect(second.result.current.isClaiming).toBe(true);
    mockEngineCall.mockClear();
    await act(async () => {
      await second.result.current.claim({ ...stale });
    });
    expect(mockEngineCall).not.toHaveBeenCalled();

    await act(async () => {
      second.rerender({ live: summary('0') });
    });
    // The selector mock is not a store subscription. The effect already
    // cleared the lock; this render is the one a real dispatch would cause.
    second.rerender({ live: summary('0') });
    expect(second.result.current.isClaiming).toBe(false);
  });

  it('signs a proof challenge and retries the same route', async () => {
    mockEngineCall.mockImplementation(
      async (_action: string, _route: string, body: InitiateClaimBody) => {
        if (!body.proofs) {
          return {
            kind: 'proof_required',
            body: {
              reason: 'PROOF_REQUIRED',
              claim_intent_id: 'intent-1',
              expires_at: '2026-09-29T00:00:00.000Z',
              challenges: [
                {
                  earning_address: EARNING_ADDRESS,
                  amount_musd_base_units: ONE_DOLLAR,
                  message: 'sign me',
                },
              ],
            },
          };
        }
        return authorized();
      },
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSignPersonalMessage).toHaveBeenCalledWith({
      data: '0x' + Buffer.from('sign me', 'utf8').toString('hex'),
      from: '0x1111111111111111111111111111111111111111',
    });
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:initiateClaim',
      'referral-trade-fee-cashback',
      {
        money_account_address: MONEY_ACCOUNT,
        claim_intent_id: 'intent-1',
        proofs: [{ earning_address: EARNING_ADDRESS, signature: '0xsig' }],
      },
    );
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('re-requests the claim for the EVM key on this phone', async () => {
    const solanaAddress = 'solana:not-on-this-phone';
    mockEngineCall.mockImplementation(
      async (_action: string, _route: string, body: InitiateClaimBody) => {
        if (body.proofs) {
          return authorized();
        }
        const challenges = [
          {
            earning_address: EARNING_ADDRESS,
            amount_musd_base_units: ONE_DOLLAR,
            message: 'sign me',
          },
          {
            earning_address: solanaAddress,
            amount_musd_base_units: ONE_DOLLAR,
            message: 'cannot sign',
          },
        ].filter(
          (challenge) =>
            !body.earning_addresses ||
            body.earning_addresses.includes(challenge.earning_address),
        );
        return {
          kind: 'proof_required',
          body: {
            reason: 'PROOF_REQUIRED',
            claim_intent_id: body.earning_addresses
              ? 'intent-narrow'
              : 'intent-all',
            expires_at: '2026-09-29T00:00:00.000Z',
            challenges,
          },
        };
      },
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).toHaveBeenNthCalledWith(
      2,
      'RewardsMoneyController:initiateClaim',
      'referral-trade-fee-cashback',
      {
        money_account_address: MONEY_ACCOUNT,
        earning_addresses: [EARNING_ADDRESS],
      },
    );
    expect(mockSignPersonalMessage).toHaveBeenCalledTimes(1);
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:initiateClaim',
      'referral-trade-fee-cashback',
      {
        money_account_address: MONEY_ACCOUNT,
        earning_addresses: [EARNING_ADDRESS],
        claim_intent_id: 'intent-narrow',
        proofs: [{ earning_address: EARNING_ADDRESS, signature: '0xsig' }],
      },
    );
  });

  it('shows the retry toast when signing the earning address fails', async () => {
    mockEngineCall.mockResolvedValue({
      kind: 'proof_required',
      body: {
        reason: 'PROOF_REQUIRED',
        claim_intent_id: 'intent-1',
        expires_at: '2026-09-29T00:00:00.000Z',
        challenges: [
          {
            earning_address: EARNING_ADDRESS,
            amount_musd_base_units: ONE_DOLLAR,
            message: 'sign me',
          },
        ],
      },
    });
    mockSignPersonalMessage.mockRejectedValue(new Error('User rejected'));
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('signs a Bitcoin challenge with the snap and submits the proof as hex', async () => {
    const bitcoin = `bc1q${'q'.repeat(38)}`;
    const earningAddress = `bip122:${bitcoin}`;
    const submitRequest = jest.fn().mockResolvedValue({
      signature: Buffer.from([1, 2, 3]).toString('base64'),
    });
    const getAccountByAddress = Engine.context.AccountsController
      .getAccountByAddress as jest.Mock;
    getAccountByAddress.mockImplementation((address: string) =>
      address === bitcoin
        ? { id: 'btc-account', address: bitcoin, type: BtcAccountType.P2wpkh }
        : undefined,
    );
    const withKeyringV2 = Engine.context.KeyringController
      .withKeyringV2 as jest.Mock;
    withKeyringV2.mockImplementation(
      async (
        _filter: unknown,
        operation: (args: {
          keyring: { submitRequest: jest.Mock };
        }) => Promise<unknown>,
      ) => operation({ keyring: { submitRequest } }),
    );
    mockEngineCall.mockImplementation(
      async (_action: string, _route: string, body: InitiateClaimBody) => {
        if (!body.proofs) {
          return {
            kind: 'proof_required',
            body: {
              reason: 'PROOF_REQUIRED',
              claim_intent_id: 'intent-btc',
              expires_at: '2026-09-29T00:00:00.000Z',
              challenges: [
                {
                  earning_address: earningAddress,
                  amount_musd_base_units: ONE_DOLLAR,
                  message: 'bip-322',
                },
              ],
            },
          };
        }
        return authorized();
      },
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSignPersonalMessage).not.toHaveBeenCalled();
    expect(submitRequest).toHaveBeenCalledWith({
      id: expect.any(String),
      origin: 'metamask',
      scope: BtcScope.Mainnet,
      account: 'btc-account',
      request: {
        method: 'signMessage',
        params: { account: { address: bitcoin }, message: 'bip-322' },
      },
    });
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:initiateClaim',
      'referral-trade-fee-cashback',
      {
        money_account_address: MONEY_ACCOUNT,
        claim_intent_id: 'intent-btc',
        proofs: [{ earning_address: earningAddress, signature: '0x010203' }],
      },
    );
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(result.current.isClaiming).toBe(false);
  });

  it('shows the unavailable toast and leaves Claim disabled when this phone has no Bitcoin account', async () => {
    const bitcoin = `bc1q${'q'.repeat(38)}`;
    const pressed = summary(ONE_DOLLAR);
    mockEngineCall.mockResolvedValue({
      kind: 'proof_required',
      body: {
        reason: 'PROOF_REQUIRED',
        claim_intent_id: 'intent-btc',
        expires_at: '2026-09-29T00:00:00.000Z',
        challenges: [
          {
            earning_address: `bip122:${bitcoin}`,
            amount_musd_base_units: ONE_DOLLAR,
            message: 'bip-322',
          },
        ],
      },
    });
    const { result, rerender } = renderHook(
      ({ live }) =>
        useClaimEarnings(PROFILE_ID, {
          persona: 'referee',
          summary: live,
          onOpened,
          onSubmitted,
          onClaimsPaused,
        }),
      { initialProps: { live: pressed } },
    );

    await act(async () => {
      await result.current.claim(pressed);
    });

    expect(mockSignPersonalMessage).not.toHaveBeenCalled();
    expect(
      Engine.context.KeyringController.withKeyringV2,
    ).not.toHaveBeenCalled();
    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureUnavailableToast,
    );
    expect(result.current.isClaiming).toBe(true);

    mockEngineCall.mockClear();
    await act(async () => {
      await result.current.claim(pressed);
    });
    expect(mockEngineCall).not.toHaveBeenCalled();

    rerender({ live: { ...pressed } });
    expect(result.current.isClaiming).toBe(true);

    rerender({ live: summary('0') });
    expect(result.current.isClaiming).toBe(false);
  });

  it('shows the retry toast when the earning address cannot be signed', async () => {
    mockEngineCall.mockResolvedValue({
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
    });
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSignPersonalMessage).not.toHaveBeenCalled();
    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it.each([KeyringTypes.ledger, KeyringTypes.snap])(
    'shows the retry toast when the earning address is on a %s keyring',
    async (keyringType) => {
      const keyring = Engine.context.KeyringController.state.keyrings[0];
      const originalType = keyring.type;
      keyring.type = keyringType;
      mockEngineCall.mockResolvedValue({
        kind: 'proof_required',
        body: {
          reason: 'PROOF_REQUIRED',
          claim_intent_id: 'intent-1',
          expires_at: '2026-09-29T00:00:00.000Z',
          challenges: [
            {
              earning_address: EARNING_ADDRESS,
              amount_musd_base_units: ONE_DOLLAR,
              message: 'sign me',
            },
          ],
        },
      });
      try {
        const { result } = renderClaim();

        await act(async () => {
          await result.current.claim(summary(ONE_DOLLAR));
        });

        expect(mockSignPersonalMessage).not.toHaveBeenCalled();
        expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
        expect(mockErrorToast).toHaveBeenCalledWith(
          localizedText.claimFailureRetryToast,
        );
      } finally {
        keyring.type = originalType;
      }
    },
  );

  it('stays on the earnings tab and shows the retry toast when the batch is rejected', async () => {
    mockSubmitClaimVoucher.mockRejectedValue(new Error('User rejected'));
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(queueClaimRewardsInPlaceOfSettledBanner).not.toHaveBeenCalled();
    expect(suppressSettledClaimBatchBanner).not.toHaveBeenCalled();
    expect(claimRewardsNotification).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it.each(['CONFIRMATION_FAILED', 'CONFIRMATION_TIMEOUT'] as const)(
    'replaces the settled trade banner with the retry line when confirmation ends in %s',
    async (reason) => {
      mockSubmitClaimVoucher.mockImplementation(async (request) => {
        request.onBatchSubmitted?.('0xbatch');
        throw new ClaimBatchConfirmationError(reason, reason);
      });
      const { result } = renderClaim();

      await act(async () => {
        await result.current.claim(summary(ONE_DOLLAR));
      });

      expect(suppressSettledClaimBatchBanner).toHaveBeenCalledWith('0xbatch');
      expect(clearSettledClaimBatchBanners).toHaveBeenCalledWith('0xbatch');
      expect(queueClaimRewardsInPlaceOfSettledBanner).toHaveBeenCalledTimes(1);
      expect(claimRewardsNotification).toHaveBeenCalledWith(
        expect.stringMatching(/^claim-rewards-\d+$/u),
        localizedText.claimFailureRetryToast,
        'error',
      );
      expect(mockErrorToast).not.toHaveBeenCalled();
      expect(onOpened).toHaveBeenCalledTimes(1);
      expect(onSubmitted).not.toHaveBeenCalled();
    },
  );

  it('shows the generic failure toast when the vault is missing', async () => {
    (selectMoneyAccountVaultConfig as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSubmitClaimVoucher).not.toHaveBeenCalled();
    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureToast,
    );
    expect(onOpened).not.toHaveBeenCalled();
  });

  it('shows the address-blocked toast when the route refuses the payout address', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(422, 'ADDRESS_BLOCKED'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureAddressBlockedToast,
    );
    expect(onOpened).not.toHaveBeenCalled();
  });

  it('records a retry when the signer is unavailable', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(422, 'SIGNER_UNAVAILABLE'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expectClaimMetric(MetaMetricsEvents.REWARDS_MONEY_CLAIM_FAILED, {
      claim_type: 'cashback',
      failure_reason: 'retry',
    });
  });

  it('shows the retry toast when login keys are unavailable', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(503, 'JWKS_UNAVAILABLE', 30),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('shows the too-large toast when nothing else fits the treasury', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(422, 'CLAIM_TOO_LARGE'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureTooLargeToast,
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('shows the success toast and still refreshes when a paid claim left an oversized group', async () => {
    mockEngineCall.mockResolvedValue({
      kind: 'authorized',
      body: {
        ...authorized().body,
        excluded: [{ type: 'SWAPS_FEE_CASHBACK', reason: 'CLAIM_TOO_LARGE' }],
      },
    });
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it.each([
    'SUSPENDED',
    'TAX_DETERMINATION_REQUIRED',
    'MECHANISM_NOT_CLAIMABLE',
    'EARNING_ADDRESS_UNSCREENABLE',
    'UNDER_REVIEW',
    'EARNING_ADDRESS_MISSING',
  ] as const)(
    'opens the paused sheet instead of a toast when the claim is refused as %s',
    async (reason) => {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyClaimRefusalError(422, reason),
      );
      const { result } = renderClaim();

      await act(async () => {
        await result.current.claim(summary(ONE_DOLLAR));
      });

      expect(onClaimsPaused).toHaveBeenCalledTimes(1);
      expect(mockErrorToast).not.toHaveBeenCalled();
      expect(mockSuccessToast).not.toHaveBeenCalled();
      expect(onSubmitted).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['NO_ELIGIBLE_BALANCE', 'claimFailureNoEligibleBalanceToast'],
    ['VOIDED', 'claimFailureToast'],
    ['CLAIM_TOO_LARGE', 'claimFailureTooLargeToast'],
  ] as const)(
    'shows the %s toast when the route refuses the claim',
    async (reason, toast) => {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyClaimRefusalError(422, reason),
      );
      const { result } = renderClaim();

      await act(async () => {
        await result.current.claim(summary(ONE_DOLLAR));
      });

      expect(mockErrorToast).toHaveBeenCalledWith(localizedText[toast]);
      expect(onClaimsPaused).not.toHaveBeenCalled();
      expect(onSubmitted).not.toHaveBeenCalled();
    },
  );

  it('shows the success toast when a paid claim excluded a held or blocked reason', async () => {
    mockEngineCall.mockResolvedValue({
      kind: 'authorized',
      body: {
        ...authorized().body,
        excluded: [{ type: 'SWAPS_FEE_CASHBACK', reason: 'UNDER_REVIEW' }],
      },
    });
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(claimRewardsNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^claim-rewards-\d+$/u),
      localizedText.claimSuccessToast,
      'success',
    );
    expect(mockSuccessToast).not.toHaveBeenCalled();
    expect(onClaimsPaused).not.toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('shows the minimum toast when the route refuses a sub-dollar claim', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(422, 'BELOW_MINIMUM'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureMinimumToast,
    );
  });

  it('shows the wait toast and does not ask for a signature when the hourly limit is short', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(409, 'VELOCITY_LIMIT_EXCEEDED'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockSignPersonalMessage).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureWaitToast,
    );
    expect(onOpened).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('shows the wait toast when a claim is already in progress', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(409, 'AWAITING_RELEASE'),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureWaitToast,
    );
  });

  it('holds Claim until Retry-After elapses', async () => {
    jest.useFakeTimers();
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyClaimRefusalError(429, 'CLAIM_COOLDOWN', 30),
      );
      const { result } = renderClaim();

      await act(async () => {
        await result.current.claim(summary(ONE_DOLLAR));
      });

      expect(mockErrorToast).toHaveBeenCalledWith(
        "You can't claim just yet. Try again in 1 minutes.",
      );
      expect(result.current.isClaimWaiting).toBe(true);

      mockEngineCall.mockClear();
      const trackedBeforeSecondPress = mockTrackEvent.mock.calls.length;
      await act(async () => {
        await result.current.claim(summary(ONE_DOLLAR));
      });
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledTimes(trackedBeforeSecondPress);

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(result.current.isClaimWaiting).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the wait in minutes when a signature refusal carries Retry-After', async () => {
    mockEngineCall.mockRejectedValue(
      new RewardsMoneyClaimRefusalError(409, 'SIGNATURE_RESERVE', 61),
    );
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockErrorToast).toHaveBeenCalledWith(
      "You can't claim just yet. Try again in 2 minutes.",
    );
    expect(result.current.isClaimWaiting).toBe(true);
  });

  it('keeps Claim disabled after the screen remounts until Retry-After elapses', async () => {
    jest.useFakeTimers();
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyClaimRefusalError(409, 'VELOCITY_LIMIT_EXCEEDED', 90),
      );
      const first = renderClaim();

      await act(async () => {
        await first.result.current.claim(summary(ONE_DOLLAR));
      });

      expect(first.result.current.isClaimWaiting).toBe(true);
      first.unmount();

      const second = renderClaim();

      expect(second.result.current.isClaimWaiting).toBe(true);
      mockEngineCall.mockClear();
      const trackedBeforeSecondPress = mockTrackEvent.mock.calls.length;
      await act(async () => {
        await second.result.current.claim(summary(ONE_DOLLAR));
      });
      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledTimes(trackedBeforeSecondPress);

      await act(async () => {
        jest.advanceTimersByTime(90_000);
      });
      expect(second.result.current.isClaimWaiting).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the Retry-After wait when the refusal lands after the tab remounts', async () => {
    jest.useFakeTimers();
    try {
      let rejectClaim: (error: unknown) => void = () => undefined;
      mockEngineCall.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectClaim = reject;
          }),
      );
      const first = renderClaim();
      let runningClaim: Promise<void> = Promise.resolve();

      await act(async () => {
        runningClaim = first.result.current.claim(summary(ONE_DOLLAR));
        await Promise.resolve();
      });
      first.unmount();

      const second = renderClaim();
      expect(second.result.current.isClaimWaiting).toBe(false);

      await act(async () => {
        rejectClaim(
          new RewardsMoneyClaimRefusalError(429, 'CLAIM_COOLDOWN', 30),
        );
        await runningClaim;
      });
      await act(async () => {
        second.rerender();
      });

      expect(second.result.current.isClaimWaiting).toBe(true);
      mockEngineCall.mockClear();
      await act(async () => {
        await second.result.current.claim(summary(ONE_DOLLAR));
      });
      expect(mockEngineCall).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('ignores a second press while a claim is in flight', async () => {
    let release: (result: InitiateClaimResult) => void = () => undefined;
    mockEngineCall.mockImplementation(
      () =>
        new Promise<InitiateClaimResult>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderClaim();
    let firstClaim: Promise<void> = Promise.resolve();

    await act(async () => {
      firstClaim = result.current.claim(summary(ONE_DOLLAR));
      await Promise.resolve();
    });

    expect(result.current.isClaiming).toBe(true);

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).not.toHaveBeenCalled();

    await act(async () => {
      release(authorized());
      await firstClaim;
    });

    expect(result.current.isClaiming).toBe(false);
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expectClaimMetric(MetaMetricsEvents.REWARDS_MONEY_CLAIM_COMPLETED, {
      claim_type: 'cashback',
      partial: false,
    });
  });

  it('keeps Claim disabled after the tab remounts while a claim is running', async () => {
    let release: (result: InitiateClaimResult) => void = () => undefined;
    mockEngineCall.mockImplementation(
      () =>
        new Promise<InitiateClaimResult>((resolve) => {
          release = resolve;
        }),
    );
    const first = renderClaim();
    let runningClaim: Promise<void> = Promise.resolve();

    await act(async () => {
      runningClaim = first.result.current.claim(summary(ONE_DOLLAR));
      await Promise.resolve();
    });
    first.unmount();

    const remounted = renderClaim();
    expect(remounted.result.current.isClaiming).toBe(true);
    mockEngineCall.mockClear();
    await act(async () => {
      await remounted.result.current.claim(summary(ONE_DOLLAR));
    });
    expect(mockEngineCall).not.toHaveBeenCalled();

    await act(async () => {
      release(authorized());
      await runningClaim;
    });
    remounted.rerender();
    expect(remounted.result.current.isClaiming).toBe(false);
  });
});
