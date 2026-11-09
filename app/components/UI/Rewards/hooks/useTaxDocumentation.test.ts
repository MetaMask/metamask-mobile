/**
 * The Earnings tab drives the visible tax journeys in a component-view test.
 * This hook test covers the return values, overlapping presses, and refusal
 * branches that screen does not expose.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyTaxError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  TaxFormTokenDto,
  TaxMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import {
  clearMintRateLimit,
  clearTaxFormSession,
  mintRateLimitRemainingMs,
  readTaxFormSession,
} from '../utils/taxDocumentation';
import {
  useTaxDocumentation,
  type TaxMintOutcome,
} from './useTaxDocumentation';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../reducers/rewardsMoney/selectors', () => ({
  selectReferralMeLocalizedText: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
  };
});

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockFetchEarningsSummary = jest.fn();

jest.mock('./useEarningsSummary', () => ({
  useEarningsSummary: () => ({
    fetchEarningsSummary: mockFetchEarningsSummary,
  }),
}));

const mockShowToast = jest.fn();
const mockErrorToast = jest.fn((message: string) => ({
  message,
  variant: 'error',
}));
const mockSuccessToast = jest.fn((message: string) => ({
  message,
  variant: 'success',
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      error: mockErrorToast,
      success: mockSuccessToast,
    },
  }),
}));

const PROFILE = 'profile-a';
const FORM_URL = 'https://tax-form.test/form';

const localizedText = {
  taxAttestationTitle: 'Are you a US person?',
  taxAttestationDescription: 'Attestation body',
  taxRenewalAttestationDescription: 'Renewal body',
  taxAnswerYes: 'Yes',
  taxAnswerNo: 'No',
  taxOpenFormTitle: 'Open the form',
  taxOpenFormDescription: 'Form body',
  taxOpenFormButton: 'Continue',
  taxNotNowButton: 'Not now',
  taxChangeAnswerButton: 'Change my answer',
  taxFormRequiredDescription: 'A form is required',
  taxTinMismatchDescription: 'The TIN did not match',
  taxFormFixDescription: 'The form needs a fix',
  taxNotNeededToast: 'No tax information is needed right now.',
  taxFormRateLimitedToast:
    'You can open the tax form again in {minutes} minutes.',
  taxErrorToast: 'Something went wrong.',
  taxFormPendingTitle: 'Pending review',
  taxFormPendingDescription: 'Pending body',
  taxDeterminationTitle: 'Tax determination needed',
  taxDeterminationDescription: 'Determination body',
  claimFailureWaitMinutesToast: 'Try again in {minutes} minutes.',
  taxFormUrl: FORM_URL,
} as unknown as ReferralLocalizedText;

const summary = {} as unknown as EarningsSummaryDto;

const taxHeldSummary = {
  earned_by_others: {
    by_claim_family: {
      SOCIAL_FOLLOW_TRADE: {
        held: '2000000',
        blocking_reason: 'TAX_DETERMINATION_REQUIRED',
      },
    },
  },
} as unknown as EarningsSummaryDto;

const revShareHeldSummary = {
  earned_by_others: {
    by_claim_family: {
      REFERRAL_REV_SHARE: {
        held: '2000000',
        blocking_reason: 'TAX_DETERMINATION_REQUIRED',
      },
    },
  },
} as unknown as EarningsSummaryDto;

const clearedTaxMe = {
  state: 'COMPLETE_OR_VERIFIED' as const,
  next_action: 'NONE' as const,
  reason: null,
  cleared: true,
};

const mockCall = Engine.controllerMessenger.call as jest.Mock;
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockUseNavigation = jest.mocked(useNavigation);
const mockUseRoute = jest.mocked(useRoute);
const mockLocalizedText = jest.mocked(selectReferralMeLocalizedText);

function taxMe(overrides: Partial<TaxMeDto> = {}): TaxMeDto {
  return {
    state: 'ACTION_REQUIRED',
    next_action: 'ANSWER_ATTESTATION',
    reason: 'NO_ATTESTATION',
    clears_until: null,
    cleared: false,
    can_change_answer: false,
    ...overrides,
  };
}

function mintedToken(token = 'form-token'): TaxFormTokenDto {
  return { token, expires_at: '2026-11-02T13:00:00.000Z' };
}

function mockTaxRead(value: TaxMeDto) {
  mockCall.mockImplementation((action: string) => {
    if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
      return Promise.resolve(null);
    }
    if (
      action === 'RewardsMoneyController:noteTaxFormSubmitted' ||
      action === 'RewardsMoneyController:clearTaxFormSubmitted'
    ) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(value);
  });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderTaxHook(routeName = 'Earnings') {
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    dispatch: mockDispatch,
    goBack: mockGoBack,
  } as unknown as ReturnType<typeof useNavigation>);
  mockUseRoute.mockReturnValue({
    name: routeName,
  } as ReturnType<typeof useRoute>);
  return renderHook(() => useTaxDocumentation(PROFILE));
}

describe('useTaxDocumentation', () => {
  const previousEnvironment = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METAMASK_ENVIRONMENT = 'production';
    clearMintRateLimit();
    clearTaxFormSession();
    mockLocalizedText.mockReturnValue(localizedText);
    mockFetchEarningsSummary.mockResolvedValue(undefined);
    mockTaxRead(taxMe());
  });

  afterAll(() => {
    process.env.METAMASK_ENVIRONMENT = previousEnvironment;
  });

  describe('prefetchTaxMe', () => {
    it('reads the determination and discards the body', async () => {
      mockCall.mockResolvedValue(taxMe({ cleared: true }));
      const { result } = renderTaxHook();

      await act(async () => {
        result.current.prefetchTaxMe();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('asks the controller for the cached read on prefetch and claim', async () => {
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        result.current.prefetchTaxMe();
        result.current.prefetchTaxMe();
        await result.current.onClaimPress(summary, claim);
      });

      const taxReads = mockCall.mock.calls.filter(
        (call: unknown[]) => call[0] === 'RewardsMoneyController:getTaxMe',
      );
      expect(taxReads).toEqual([
        ['RewardsMoneyController:getTaxMe'],
        ['RewardsMoneyController:getTaxMe'],
        ['RewardsMoneyController:getTaxMe'],
      ]);
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('still prefetches the determination when the form URL is hidden', async () => {
      mockLocalizedText.mockReturnValue({ ...localizedText, taxFormUrl: '' });
      const { result } = renderTaxHook();

      await act(async () => {
        result.current.prefetchTaxMe();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('swallows a failed prefetch', async () => {
      mockCall.mockRejectedValue(new Error('offline'));
      const { result } = renderTaxHook();

      await act(async () => {
        result.current.prefetchTaxMe();
        await Promise.resolve();
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('onClaimPress', () => {
    it('reads tax/me fresh and opens the sheet when income is held only for tax', async () => {
      mockCall.mockImplementation(
        (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
            return Promise.resolve(null);
          }
          if (action === 'RewardsMoneyController:getTaxMe') {
            return Promise.resolve(
              params?.forceFresh ? taxMe() : { ...taxMe(), ...clearedTaxMe },
            );
          }
          return Promise.resolve(undefined);
        },
      );
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(taxHeldSummary, claim);
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe', {
        forceFresh: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({
          question: 'attestation',
          title: localizedText.taxAttestationTitle,
        }),
      );
      expect(claim).toHaveBeenCalledWith({ omitFollowTrade: true });
      expect(mockFetchEarningsSummary).not.toHaveBeenCalled();
    });

    it('reads tax/me fresh when revenue share is held only for tax', async () => {
      mockCall.mockImplementation(
        (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
            return Promise.resolve(null);
          }
          if (action === 'RewardsMoneyController:getTaxMe') {
            return Promise.resolve(
              params?.forceFresh ? taxMe() : { ...taxMe(), ...clearedTaxMe },
            );
          }
          return Promise.resolve(undefined);
        },
      );
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(revShareHeldSummary, claim);
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe', {
        forceFresh: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({ question: 'attestation' }),
      );
    });

    it('refreshes the summary when a tax hold reads as already cleared', async () => {
      mockTaxRead(taxMe(clearedTaxMe));
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(taxHeldSummary, claim);
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe', {
        forceFresh: true,
      });
      expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
        forceFresh: true,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('opens the attestation and still claims when the payee is not cleared', async () => {
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({
          question: 'attestation',
          title: localizedText.taxAttestationTitle,
          profileId: PROFILE,
        }),
      );
      expect(claim).toHaveBeenCalledWith({ omitFollowTrade: true });
    });

    it('does not open a second sheet when that claim is refused for tax', async () => {
      const { result } = renderTaxHook();
      const claim = jest.fn(async () => {
        await result.current.openAfterClaimRefusal();
      });

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({ question: 'attestation' }),
      );
    });

    it('opens the renewal question and still claims when the payee is cleared', async () => {
      mockTaxRead(
        taxMe({
          state: 'RENEWAL_REQUIRED',
          next_action: 'ANSWER_ATTESTATION',
          reason: null,
          cleared: true,
        }),
      );
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({
          description: localizedText.taxRenewalAttestationDescription,
        }),
      );
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('refreshes the summary and opens no sheet when the gate is off', async () => {
      mockTaxRead(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'GATE_OFF',
          cleared: true,
        }),
      );
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
        forceFresh: true,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('shows the error toast and still claims when the tax read fails', async () => {
      mockCall.mockRejectedValue(new Error('offline'));
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockErrorToast).toHaveBeenCalledWith(localizedText.taxErrorToast);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('stays silent and still claims when the tax read is unauthorized', async () => {
      mockCall.mockRejectedValue(
        new RewardsMoneyAuthorizationError('signed out'),
      );
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('ignores a second press while the first tax read is in flight', async () => {
      const pending = deferred<TaxMeDto>();
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
          return Promise.resolve(null);
        }
        return pending.promise;
      });
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();
      let first: Promise<void> = Promise.resolve();

      act(() => {
        first = result.current.onClaimPress(summary, claim);
        void result.current.onClaimPress(summary, claim);
      });
      pending.resolve(taxMe());
      await act(async () => {
        await first;
      });

      expect(mockCall).toHaveBeenCalledTimes(2);
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('keeps the pending sheet while a submitted form is still the open-form read', async () => {
      const openForm = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'NO_FORM',
        can_change_answer: true,
      });
      const snapshot = {
        state: 'ACTION_REQUIRED' as const,
        next_action: 'OPEN_FORM' as const,
        reason: 'NO_FORM' as const,
      };
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
          return Promise.resolve(snapshot);
        }
        return Promise.resolve(openForm);
      });
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe', {
        forceFresh: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
        expect.objectContaining({
          title: localizedText.taxFormPendingTitle,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
        expect.anything(),
      );
      expect(claim).toHaveBeenCalledTimes(1);
    });

    it('follows a new stored form that presents the same reason', async () => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
          return Promise.resolve({
            state: 'ACTION_REQUIRED',
            next_action: 'OPEN_FORM',
            reason: 'TIN_NOT_MATCHED',
            stored_at: '2026-11-09T12:00:00.000Z',
          });
        }
        return Promise.resolve(
          taxMe({
            next_action: 'OPEN_FORM',
            reason: 'TIN_NOT_MATCHED',
            stored_at: '2026-11-09T18:00:00.000Z',
          }),
        );
      });
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
        expect.objectContaining({
          description: localizedText.taxTinMismatchDescription,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
        expect.anything(),
      );
    });

    it('follows the new determination once the submitted snapshot changes', async () => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
          return Promise.resolve({
            state: 'ACTION_REQUIRED',
            next_action: 'OPEN_FORM',
            reason: 'NO_FORM',
          });
        }
        return Promise.resolve(
          taxMe({
            next_action: 'OPEN_FORM',
            reason: 'TIN_NOT_MATCHED',
          }),
        );
      });
      const claim = jest.fn().mockResolvedValue(undefined);
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.onClaimPress(summary, claim);
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        null,
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
        expect.objectContaining({
          description: localizedText.taxTinMismatchDescription,
        }),
      );
      expect(claim).toHaveBeenCalledTimes(1);
    });
  });

  describe('openAfterClaimRefusal', () => {
    it('opens the sheet from the fresh determination', async () => {
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.openAfterClaimRefusal();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
        expect.objectContaining({ question: 'attestation' }),
      );
    });

    it('stays on the pending sheet when a refusal still matches the submitted snapshot', async () => {
      const openForm = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'NO_FORM',
      });
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxFormSubmitted') {
          return Promise.resolve({
            state: 'ACTION_REQUIRED',
            next_action: 'OPEN_FORM',
            reason: 'NO_FORM',
          });
        }
        return Promise.resolve(openForm);
      });
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.openAfterClaimRefusal();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
        expect.objectContaining({
          title: localizedText.taxFormPendingTitle,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
        expect.anything(),
      );
    });

    it('throws when the determination opens no sheet', async () => {
      mockTaxRead(
        taxMe({
          state: 'COMPLETE_OR_VERIFIED',
          next_action: 'NONE',
          reason: null,
          cleared: true,
        }),
      );
      const { result } = renderTaxHook();

      await expect(
        act(async () => {
          await result.current.openAfterClaimRefusal();
        }),
      ).rejects.toThrow('Tax determination did not open a sheet');
    });
  });

  describe('submitAnswer', () => {
    it('opens the pending sheet and does not re-read when review is pending', async () => {
      mockCall.mockResolvedValue({ review: 'PENDING' });
      const { result } = renderTaxHook(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET);

      await act(async () => {
        await result.current.submitAnswer('attestation', true);
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:submitTaxAttestation',
        true,
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'RewardsMoneyController:getTaxMe',
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
          expect.objectContaining({
            title: localizedText.taxFormPendingTitle,
          }),
        ),
      );
    });

    it('submits the US activity answer on that question', async () => {
      mockCall.mockImplementation(async (action: string) => {
        if (action === 'RewardsMoneyController:submitTaxUsActivity') {
          return { review: 'NONE' };
        }
        return taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'REVIEW_PENDING',
        });
      });
      const { result } = renderTaxHook(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET);

      await act(async () => {
        await result.current.submitAnswer('us_activity', false);
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:submitTaxUsActivity',
        false,
      );
    });

    it('shows the not-needed toast after No when the re-read is clear', async () => {
      mockCall.mockImplementation(async (action: string) => {
        if (action === 'RewardsMoneyController:submitTaxAttestation') {
          return { review: 'NONE' };
        }
        return taxMe({
          state: 'COMPLETE_OR_VERIFIED',
          next_action: 'NONE',
          reason: null,
          cleared: true,
        });
      });
      const { result } = renderTaxHook(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET);

      await act(async () => {
        await result.current.submitAnswer('attestation', false);
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockSuccessToast).toHaveBeenCalledWith(
        localizedText.taxNotNeededToast,
      );
      expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
        forceFresh: true,
      });
    });

    it('shows the error toast when the re-read after an answer fails', async () => {
      mockCall.mockImplementation(async (action: string) => {
        if (action === 'RewardsMoneyController:submitTaxAttestation') {
          return { review: 'NONE' };
        }
        throw new Error('offline');
      });
      const { result } = renderTaxHook();

      await act(async () => {
        await result.current.submitAnswer('attestation', true);
      });

      expect(mockErrorToast).toHaveBeenCalledWith(localizedText.taxErrorToast);
    });

    it('shows the wait toast and stays on an answer 429', async () => {
      mockCall.mockRejectedValue(
        new RewardsMoneyTaxError(429, 'RATE_LIMITED', 120),
      );
      const { result } = renderTaxHook(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET);

      await act(async () => {
        await result.current.submitAnswer('attestation', true);
      });

      expect(mockErrorToast).toHaveBeenCalledWith('Try again in 2 minutes.');
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('logs a rejected answer and stays on the question', async () => {
      const error = new RewardsMoneyTaxError(400, 'BAD_REQUEST');
      mockCall.mockRejectedValue(error);
      const { result } = renderTaxHook(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET);

      await act(async () => {
        await result.current.submitAnswer('attestation', true);
      });

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Tax answer was rejected',
      );
      expect(mockErrorToast).toHaveBeenCalledWith(localizedText.taxErrorToast);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('ignores an overlapping answer', async () => {
      const pending = deferred<{ review: 'NONE' }>();
      mockCall.mockReturnValue(pending.promise);
      const { result } = renderTaxHook();
      let first: Promise<void> = Promise.resolve();

      act(() => {
        first = result.current.submitAnswer('attestation', true);
        void result.current.submitAnswer('attestation', false);
      });
      pending.resolve({ review: 'NONE' });
      await act(async () => {
        await first;
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:submitTaxAttestation',
        true,
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'RewardsMoneyController:submitTaxAttestation',
        false,
      );
    });
  });

  describe('mintTaxForm', () => {
    it('navigates to the form and holds the token from Earnings', async () => {
      mockCall.mockResolvedValue(mintedToken());
      const { result } = renderTaxHook();
      let outcome: TaxMintOutcome = 'failed';

      await act(async () => {
        outcome = await result.current.mintTaxForm();
      });

      expect(outcome).toBe('opened');
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_TAX_FORM_VIEW, {
        url: FORM_URL,
        profileId: PROFILE,
      });
      expect(readTaxFormSession()).toEqual({
        token: 'form-token',
        expiresAt: '2026-11-02T13:00:00.000Z',
      });
    });

    it('replaces the open-form sheet with the form', async () => {
      mockCall.mockResolvedValue(mintedToken());
      const { result } = renderTaxHook(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
      );

      await act(async () => {
        await result.current.mintTaxForm();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.REWARDS_TAX_FORM_VIEW, {
          url: FORM_URL,
          profileId: PROFILE,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('returns rate_limited and records the deadline on a mint 429', async () => {
      mockCall.mockRejectedValue(
        new RewardsMoneyTaxError(429, 'RATE_LIMITED', 120),
      );
      const { result } = renderTaxHook(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
      );
      let outcome: TaxMintOutcome = 'failed';

      await act(async () => {
        outcome = await result.current.mintTaxForm();
      });

      expect(outcome).toBe('rate_limited');
      expect(mockErrorToast).toHaveBeenCalledWith(
        'You can open the tax form again in 2 minutes.',
      );
      expect(mintRateLimitRemainingMs(PROFILE)).toBeGreaterThan(0);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns closed and opens the determination sheet when the form URL is empty', async () => {
      mockLocalizedText.mockReturnValue({ ...localizedText, taxFormUrl: '' });
      const { result } = renderTaxHook(
        Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
      );
      let outcome: TaxMintOutcome = 'opened';

      await act(async () => {
        outcome = await result.current.mintTaxForm();
      });

      expect(outcome).toBe('closed');
      expect(mockCall).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
          expect.objectContaining({
            title: localizedText.taxDeterminationTitle,
          }),
        ),
      );
    });

    it('returns failed without a second mint while one is in flight', async () => {
      const pending = deferred<TaxFormTokenDto>();
      mockCall.mockReturnValue(pending.promise);
      const { result } = renderTaxHook();
      let first: Promise<TaxMintOutcome> = Promise.resolve('failed');
      let second: TaxMintOutcome = 'opened';

      act(() => {
        first = result.current.mintTaxForm();
        void result.current.mintTaxForm().then((outcome) => {
          second = outcome;
        });
      });
      pending.resolve(mintedToken());
      await act(async () => {
        await first;
      });

      expect(second).toBe('failed');
      expect(mockCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('replaceExpiredToken', () => {
    it('returns the new token and holds it', async () => {
      mockCall.mockResolvedValue(mintedToken('form-token-2'));
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);
      let minted: TaxFormTokenDto | null = null;

      await act(async () => {
        minted = await result.current.replaceExpiredToken();
      });

      expect(minted).toEqual(mintedToken('form-token-2'));
      expect(readTaxFormSession()?.token).toBe('form-token-2');
    });

    it('returns null when the re-mint is refused', async () => {
      mockCall.mockRejectedValue(
        new RewardsMoneyTaxError(503, 'TAX_PROVIDER_UNAVAILABLE'),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);
      let minted: TaxFormTokenDto | null = mintedToken();

      await act(async () => {
        minted = await result.current.replaceExpiredToken();
      });

      expect(minted).toBeNull();
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
          expect.objectContaining({
            title: localizedText.taxDeterminationTitle,
          }),
        ),
      );
    });
  });

  describe('rerouteFromForm', () => {
    it('opens the sheet from a fresh determination', async () => {
      mockCall.mockResolvedValue(
        taxMe({
          next_action: 'OPEN_FORM',
          reason: 'NO_FORM',
          can_change_answer: true,
        }),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        await result.current.rerouteFromForm();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
          expect.objectContaining({
            changeAnswerLabel: localizedText.taxChangeAnswerButton,
            profileId: PROFILE,
          }),
        ),
      );
    });

    it('opens the determination sheet when the re-read fails', async () => {
      mockCall.mockRejectedValue(new Error('offline'));
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        await result.current.rerouteFromForm();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
          expect.objectContaining({
            title: localizedText.taxDeterminationTitle,
          }),
        ),
      );
    });

    it('stays silent when the re-read is unauthorized', async () => {
      mockCall.mockRejectedValue(
        new RewardsMoneyAuthorizationError('signed out'),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        await result.current.rerouteFromForm();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('closeFormWithError', () => {
    it('shows the error toast and leaves the form', () => {
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      act(() => {
        result.current.closeFormWithError();
      });

      expect(mockErrorToast).toHaveBeenCalledWith(localizedText.taxErrorToast);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('openPendingReview', () => {
    it('opens the pending sheet, refreshes, and remembers a pre-webhook read', async () => {
      mockTaxRead(
        taxMe({
          next_action: 'OPEN_FORM',
          reason: 'NO_FORM',
        }),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
          expect.objectContaining({
            title: localizedText.taxFormPendingTitle,
          }),
        ),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
        forceFresh: true,
      });
      expect(mockCall).toHaveBeenCalledWith('RewardsMoneyController:getTaxMe', {
        forceFresh: true,
      });
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        {
          state: 'ACTION_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'NO_FORM',
          stored_at: null,
        },
      );
    });

    it('drops the snapshot when a new form is stored with the same reason', async () => {
      const cached = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'TIN_NOT_MATCHED',
        stored_at: '2026-11-09T12:00:00.000Z',
      });
      const fresh = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'TIN_NOT_MATCHED',
        stored_at: '2026-11-09T18:00:00.000Z',
      });
      mockCall.mockImplementation(
        (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'RewardsMoneyController:getTaxMe') {
            return Promise.resolve(params?.forceFresh ? fresh : cached);
          }
          return Promise.resolve(undefined);
        },
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        null,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(
          Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
          expect.objectContaining({
            description: localizedText.taxTinMismatchDescription,
          }),
        ),
      );
    });

    it('remembers a correction that is still an open-form read', async () => {
      mockTaxRead(
        taxMe({
          next_action: 'OPEN_FORM',
          reason: 'FORM_INVALID',
        }),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        {
          state: 'ACTION_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'FORM_INVALID',
          stored_at: null,
        },
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('clears the marker when the fresh read is no longer an open form', async () => {
      mockTaxRead(
        taxMe({
          state: 'COMPLETE_OR_VERIFIED',
          next_action: 'NONE',
          reason: null,
          cleared: true,
        }),
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        null,
      );
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('remembers the pre-webhook snapshot when the fresh read fails', async () => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsMoneyController:getTaxMe') {
          return Promise.reject(new Error('offline'));
        }
        return Promise.resolve(undefined);
      });
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        {
          state: 'ACTION_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'NO_FORM',
          stored_at: null,
        },
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('records the open-form snapshot before the fresh status read resolves', async () => {
      const fresh = deferred<TaxMeDto>();
      const cached = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'TIN_NOT_MATCHED',
      });
      mockCall.mockImplementation(
        (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'RewardsMoneyController:getTaxMe') {
            if (params?.forceFresh) {
              return fresh.promise;
            }
            return Promise.resolve(cached);
          }
          return Promise.resolve(undefined);
        },
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
        await Promise.resolve();
      });

      const notedAt = mockCall.mock.calls.findIndex(
        (call) => call[0] === 'RewardsMoneyController:noteTaxFormSubmitted',
      );
      const freshAt = mockCall.mock.calls.findIndex(
        (call) =>
          call[0] === 'RewardsMoneyController:getTaxMe' &&
          (call[1] as { forceFresh?: boolean } | undefined)?.forceFresh ===
            true,
      );
      expect(notedAt).toBeGreaterThanOrEqual(0);
      expect(freshAt).toBeGreaterThan(notedAt);
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        {
          state: 'ACTION_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'TIN_NOT_MATCHED',
          stored_at: null,
        },
      );

      fresh.resolve(cached);
      await act(async () => {
        await fresh.promise;
      });
    });

    it('remembers the cached open-form read when the fresh read fails', async () => {
      const cached = taxMe({
        next_action: 'OPEN_FORM',
        reason: 'TIN_NOT_MATCHED',
      });
      mockCall.mockImplementation(
        (action: string, params?: { forceFresh?: boolean }) => {
          if (action === 'RewardsMoneyController:getTaxMe') {
            if (params?.forceFresh) {
              return Promise.reject(new Error('offline'));
            }
            return Promise.resolve(cached);
          }
          return Promise.resolve(undefined);
        },
      );
      const { result } = renderTaxHook(Routes.REWARDS_TAX_FORM_VIEW);

      await act(async () => {
        result.current.openPendingReview();
        await Promise.resolve();
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:noteTaxFormSubmitted',
        {
          state: 'ACTION_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'TIN_NOT_MATCHED',
          stored_at: null,
        },
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});
