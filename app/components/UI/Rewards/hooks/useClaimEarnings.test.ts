/**
 * The Earnings tab mocks this hook, and the behavior here is toast choice,
 * challenge signing, and confirmation navigation rather than rendered screen
 * state, so this stays a hook unit test.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectMoneyAccountVaultConfig,
  type MoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import { RewardsMoneyClaimRefusalError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  ClaimVoucherDto,
  EarningsSummaryDto,
  InitiateClaimBody,
  InitiateClaimResult,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import useRewardsToast from './useRewardsToast';
import { submitClaimVoucher } from '../utils/claimEarnings';
import { useClaimEarnings } from './useClaimEarnings';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../reducers/rewardsMoney/selectors', () => ({
  selectReferralMeLocalizedText: jest.fn(),
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
    KeyringController: { signPersonalMessage: jest.fn() },
  },
}));

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: { getCurrentRoute: jest.fn() },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(),
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
const EARNING_ADDRESS = 'eip155:143:0x1111111111111111111111111111111111111111';
const ONE_DOLLAR = '1000000';
const UNDER_DOLLAR = '999999';

const localizedText = {
  claimSuccessToast: 'Earnings successfully claimed',
  claimFailureToast: 'Earnings could not be claimed',
  claimFailureRetryToast: 'Try again',
  claimFailureWaitToast: 'Try again shortly',
  claimFailureMinimumToast: 'Earn at least $1',
  claimFailureAddressBlockedToast: 'Address blocked',
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
    forfeited: '0',
    minimum_musd_base_units: ONE_DOLLAR,
    self_earned: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      forfeited: '0',
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: {
          lifetime: '0',
          claimable,
          pending: '0',
          claimed: '0',
          forfeited: '0',
          by_address: [],
        },
      },
    },
    earned_by_others: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      forfeited: '0',
      by_claim_family: {},
    },
  };
}

describe('useClaimEarnings', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockSignPersonalMessage = Engine.context.KeyringController
    .signPersonalMessage as jest.Mock;
  const mockGetCurrentRoute = NavigationService.navigation
    .getCurrentRoute as jest.Mock;
  const mockGoBack = jest.fn();
  const mockNavigateToConfirmation = jest.fn();
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

  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    };
    (selectReferralMeLocalizedText as jest.Mock).mockReturnValue(localizedText);
    (selectPrimaryMoneyAccount as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT,
    });
    (selectMoneyAccountVaultConfig as jest.Mock).mockReturnValue(vaultConfig);
    (getGasFeesSponsoredNetworkEnabled as unknown as jest.Mock).mockReturnValue(
      () => true,
    );
    (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack });
    (useConfirmNavigation as jest.Mock).mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    });
    (useRewardsToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      RewardsToastOptions: {
        success: mockSuccessToast,
        error: mockErrorToast,
      },
    });
    mockEngineCall.mockResolvedValue(authorized());
    mockSignPersonalMessage.mockResolvedValue('0xsig');
    mockSubmitClaimVoucher.mockResolvedValue(undefined);
    mockGetCurrentRoute.mockReturnValue({
      name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    });
  });

  function renderClaim(variant: 'REFEREE' | 'REFERRER' = 'REFEREE') {
    return renderHook(() =>
      useClaimEarnings(PROFILE_ID, { variant, onOpened, onSubmitted }),
    );
  }

  it('leaves the claim unsent for a referrer', async () => {
    const { result } = renderClaim('REFERRER');

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('leaves the claim unsent when the summary is under $1', async () => {
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(UNDER_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
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
  });

  it('shows the generic failure toast and does not open a claim when there is no money account', async () => {
    (selectPrimaryMoneyAccount as jest.Mock).mockReturnValue(undefined);
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureToast,
    );
    expect(result.current.isClaiming).toBe(false);
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
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
    });
    expect(mockSubmitClaimVoucher).toHaveBeenCalledWith({
      voucher,
      vaultConfig,
      moneyAccountAddress: MONEY_ACCOUNT,
    });
    expect(mockSuccessToast).toHaveBeenCalledWith(
      localizedText.claimSuccessToast,
    );
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(result.current.isClaiming).toBe(false);
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

  it('shows the retry toast when the earning address cannot be signed', async () => {
    mockEngineCall.mockResolvedValue({
      kind: 'proof_required',
      body: {
        reason: 'PROOF_REQUIRED',
        claim_intent_id: 'intent-1',
        expires_at: '2026-09-29T00:00:00.000Z',
        challenges: [
          {
            earning_address: 'not-caip',
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

  it('goes back and shows the retry toast when the batch is rejected', async () => {
    mockSubmitClaimVoucher.mockRejectedValue(new Error('User rejected'));
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('stays on the current screen when confirmation is no longer open', async () => {
    mockSubmitClaimVoucher.mockRejectedValue(new Error('User rejected'));
    mockGetCurrentRoute.mockReturnValue({ name: 'Rewards' });
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(
      localizedText.claimFailureRetryToast,
    );
  });

  it('shows the generic failure toast without opening confirmation when the vault is missing', async () => {
    (selectMoneyAccountVaultConfig as jest.Mock).mockReturnValue(undefined);
    const { result } = renderClaim();

    await act(async () => {
      await result.current.claim(summary(ONE_DOLLAR));
    });

    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
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

    await act(async () => {
      release(authorized());
      await firstClaim;
    });

    expect(result.current.isClaiming).toBe(false);
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});
