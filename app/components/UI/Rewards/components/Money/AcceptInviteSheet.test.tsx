import React from 'react';
import { Provider } from 'react-redux';
import { act, fireEvent, render } from '@testing-library/react-native';
import configureStore from '../../../../../util/test/configureStore';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { setReferralMe } from '../../../../../reducers/rewardsMoney';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import type {
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { MONEY_REFERRAL_CODE_DEBOUNCE_MS } from '../../hooks/useValidateMoneyReferralCode';
import AcceptInviteSheet, {
  ACCEPT_INVITE_SHEET_TEST_IDS,
} from './AcceptInviteSheet';

const PROFILE_ID = 'profile-1';
const TEST_IDS = ACCEPT_INVITE_SHEET_TEST_IDS;

const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn();
const mockAcceptReferralCode = jest.fn();
const mockUseAcceptMoneyReferralCode = jest.fn();
const mockUseSessionProfileId = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

// The design-system sheet is mocked globally without forwarding its props;
// forwarding them here is what lets the dismissal wiring be asserted.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        goBack,
        onClose,
        isInteractable,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
        onClose?: () => void;
        isInteractable?: boolean;
      },
      ref: React.Ref<{
        onCloseBottomSheet: () => void;
        onOpenBottomSheet: () => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(
        RN.View,
        { testID, goBack, onClose, isInteractable },
        children,
      );
    },
  );
  BottomSheet.displayName = 'BottomSheet';
  return {
    ...actual,
    BottomSheet,
  };
});

jest.mock('../../hooks/useReferralMe', () => ({
  useSessionProfileId: () => mockUseSessionProfileId(),
}));

// The real hook resolves the session asynchronously, which is what the copy
// this screen reads depends on; the tests below run it rather than a stand-in.
const { useSessionProfileId: realUseSessionProfileId } = jest.requireActual<
  typeof import('../../hooks/useReferralMe')
>('../../hooks/useReferralMe');

jest.mock('../../hooks/useAcceptMoneyReferralCode', () => ({
  useAcceptMoneyReferralCode: () => mockUseAcceptMoneyReferralCode(),
}));

const INVITE_HERO = {
  lightModeUrl: 'https://example.com/invite-light.png',
  darkModeUrl: 'https://example.com/invite-dark.png',
};

const LOCALIZED_TEXT = {
  inviteTitle: 'Claim your invite',
  inviteBody: 'Your friend sent you a code that earns you cashback.',
  inviteReferralCode: 'Invite code',
  inviteUseDifferentCode: 'Use a different code',
  inviteCodePlaceholder: 'Enter a code',
  inviteCancelEdit: 'Keep original',
  inviteDecline: 'No thanks',
  inviteAccept: 'Accept invite',
  inviteIllustrationLabel: 'Two friends trading',
} as unknown as ReferralLocalizedText;

const buildReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  role: 'NONE',
  variant: 'NONE',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: null,
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: null,
    cashback_rate_bps: null,
    revshare_earning_term_minutes: null,
    cashback_earning_term_minutes: null,
  },
  localized_text: LOCALIZED_TEXT,
  invite_hero: INVITE_HERO,
  ...overrides,
});

let referralMeEntries: Record<
  string,
  { loading: boolean; error: boolean; data: ReferralMeDto | null }
>;
let appTheme: 'light' | 'dark';

const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

const advanceDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(MONEY_REFERRAL_CODE_DEBOUNCE_MS);
  });
};

const renderSheetSync = (referralCode?: string) => {
  const store = configureStore({
    user: { appTheme },
    rewardsMoney: { referralMe: referralMeEntries },
  });
  const view = render(
    <Provider store={store}>
      <AcceptInviteSheet route={{ params: { referralCode } }} />
    </Provider>,
  );
  return { ...view, store };
};

/** Renders and lets the prefilled code finish its debounced validation. */
const renderSheet = async (referralCode?: string) => {
  const view = renderSheetSync(referralCode);
  await advanceDebounce();
  return view;
};

/**
 * Holds the session read open so the frames before it comes back can be
 * asserted, the way they are on a real launch.
 */
const deferSessionProfile = ({ signedOut = false } = {}) => {
  let resolveProfile: (
    profile: { profileId: string } | undefined,
  ) => void = () => undefined;
  const pendingProfile = new Promise<{ profileId: string } | undefined>(
    (resolve) => {
      resolveProfile = resolve;
    },
  );

  mockUseSessionProfileId.mockImplementation(() => realUseSessionProfileId());
  mockEngineCall.mockImplementation(async (action: string) => {
    if (action === 'AuthenticationController:getSessionProfile') {
      return pendingProfile;
    }
    if (action === 'RewardsMoneyController:validateReferralCode') {
      return { success: true };
    }
    return undefined;
  });

  return {
    resolveProfile: async () => {
      await act(async () => {
        resolveProfile(signedOut ? undefined : { profileId: PROFILE_ID });
      });
      await advanceDebounce();
    },
  };
};

describe('AcceptInviteSheet', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    appTheme = 'light';
    referralMeEntries = {
      [PROFILE_ID]: { loading: false, error: false, data: buildReferralMe() },
    };
    mockUseSessionProfileId.mockReturnValue({
      profileId: PROFILE_ID,
      isResolved: true,
    });
    mockAcceptReferralCode.mockResolvedValue(true);
    mockUseAcceptMoneyReferralCode.mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: false,
      errorMessage: '',
      clearError: jest.fn(),
    });
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'RewardsMoneyController:validateReferralCode') {
        return { success: true };
      }
      return undefined;
    });
  });

  it('passes a goBack that navigates back to BottomSheet without an onClose override', async () => {
    const { getByTestId } = await renderSheet();

    const sheet = getByTestId(TEST_IDS.CONTAINER);

    expect(typeof sheet.props.goBack).toBe('function');
    expect(sheet.props.onClose).toBeUndefined();

    sheet.props.goBack();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('leaves native back, overlay, and swipe dismissal enabled', async () => {
    const { getByTestId } = await renderSheet();

    const sheet = getByTestId(TEST_IDS.CONTAINER);

    expect(sheet.props.isInteractable).toBeUndefined();
    sheet.props.goBack();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['REFEREE', 'REFEREE'],
    ['REFERRER', 'REFERRER'],
    ['BOTH', 'REFERRER'],
  ] as const)(
    'closes without rendering the invite for role %s using variant %s',
    (role, variant) => {
      referralMeEntries = {
        [PROFILE_ID]: {
          loading: false,
          error: false,
          data: buildReferralMe({ role, variant }),
        },
      };

      const { queryByTestId } = renderSheetSync('KOL1');

      expect(queryByTestId(TEST_IDS.CONTAINER)).toBeNull();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    },
  );

  it('does not pop again when accept refreshes referral me to a referee', async () => {
    const { getByTestId, queryByTestId, store } = await renderSheet('KOL1');

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();

    await act(async () => {
      store.dispatch(
        setReferralMe({
          profileId: PROFILE_ID,
          data: buildReferralMe({ role: 'REFEREE', variant: 'REFEREE' }),
        }),
      );
    });

    // Dismissal after register belongs to useAcceptMoneyReferralCode. This
    // screen must not goBack a second time just because variant is no longer
    // NONE — that would pop Rewards as well as the sheet.
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(queryByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });

  it('closes when a pending referral-me load settles as already referred', async () => {
    referralMeEntries = {
      [PROFILE_ID]: { loading: true, error: false, data: null },
    };

    const { queryByTestId, store } = renderSheetSync('KOL1');

    expect(queryByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => {
      store.dispatch(
        setReferralMe({
          profileId: PROFILE_ID,
          data: buildReferralMe({ role: 'REFEREE', variant: 'REFEREE' }),
        }),
      );
    });

    expect(queryByTestId(TEST_IDS.CONTAINER)).toBeNull();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('prefills the normalized route code', async () => {
    const { getByTestId } = await renderSheet('kol1');

    expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
  });

  it('renders the invite copy and hero of the current profile', async () => {
    const { getByText, getByTestId } = await renderSheet('KOL1');

    expect(getByText('Claim your invite')).toBeOnTheScreen();
    expect(
      getByText('Your friend sent you a code that earns you cashback.'),
    ).toBeOnTheScreen();
    expect(getByText('Invite code')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.HERO)).toBeOnTheScreen();
  });

  it('reads no copy from another profile entry', async () => {
    referralMeEntries = {
      'profile-2': { loading: false, error: false, data: buildReferralMe() },
    };

    const { queryByText, queryByTestId } = await renderSheet('KOL1');

    expect(queryByText('Claim your invite')).toBeNull();
    expect(queryByTestId(TEST_IDS.HERO)).toBeNull();
  });

  it('labels the code from existing Mobile copy when the server sent none', async () => {
    referralMeEntries = {};

    const { getByText } = await renderSheet('KOL1');

    const fallbackLabel = strings('rewards.referral.referral_code');
    expect(fallbackLabel).not.toBe('rewards.referral.referral_code');
    expect(getByText(fallbackLabel)).toBeOnTheScreen();
  });

  it('keeps the actions usable when the server sent no copy', async () => {
    referralMeEntries = {};

    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).toHaveBeenCalledWith('KOL1');
  });

  it('omits the hero when the payload has no invite image', async () => {
    referralMeEntries = {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: buildReferralMe({ invite_hero: null }),
      },
    };

    const { queryByTestId } = await renderSheet('KOL1');

    expect(queryByTestId(TEST_IDS.HERO)).toBeNull();
  });

  it('swaps the code for an input when a different code is requested', async () => {
    const { getByTestId, queryByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));

    expect(getByTestId(TEST_IDS.CODE_INPUT)).toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.CODE)).toBeNull();
  });

  it('validates an edited code through the Money validate hook', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'ab12cd');
    await advanceDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:validateReferralCode',
      'AB12CD',
    );
    expect(getByTestId(TEST_IDS.CODE_VALID)).toBeOnTheScreen();
  });

  it('can restore the original code after the edited code validates', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'ab12cd');
    await advanceDebounce();

    expect(getByTestId(TEST_IDS.CODE_VALID)).toBeOnTheScreen();
    const cancelEdit = getByTestId(TEST_IDS.CANCEL_EDIT);
    expect(cancelEdit.props.accessibilityRole).toBe('button');

    fireEvent.press(cancelEdit);
    await advanceDebounce();

    expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
  });

  it('shows the invalid-code error and blocks accept when the server rejects the code', async () => {
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'RewardsMoneyController:validateReferralCode') {
        return { success: false };
      }
      return undefined;
    });

    const { getByTestId, queryByTestId } = await renderSheet('BADCODE');

    expect(getByTestId(TEST_IDS.CODE_ERROR)).toHaveTextContent(
      strings('rewards.error_messages.invalid_referral_code'),
    );
    expect(queryByTestId(TEST_IDS.CODE_VALID)).toBeNull();

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).not.toHaveBeenCalled();
  });

  it('shows a register refusal as the field error instead of blocking accept', async () => {
    mockUseAcceptMoneyReferralCode.mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: false,
      errorMessage: strings(
        'rewards.error_messages.cannot_use_own_referral_code',
      ),
      clearError: jest.fn(),
    });

    const { getByTestId, queryByTestId } = await renderSheet('KOL1');

    expect(getByTestId(TEST_IDS.CODE_ERROR)).toHaveTextContent(
      strings('rewards.error_messages.cannot_use_own_referral_code'),
    );

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));

    expect(queryByTestId(TEST_IDS.CODE_VALID)).toBeNull();

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).toHaveBeenCalledWith('KOL1');
  });

  it('clears the register error when the code is edited', async () => {
    const mockClearError = jest.fn();
    mockUseAcceptMoneyReferralCode.mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: false,
      errorMessage: strings('rewards.error_messages.already_referred'),
      clearError: mockClearError,
    });

    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'AB12CD');

    expect(mockClearError).toHaveBeenCalled();
  });

  it('still allows accept when validation itself failed', async () => {
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'RewardsMoneyController:validateReferralCode') {
        throw new Error('offline');
      }
      return undefined;
    });

    const { getByTestId } = await renderSheet('KOL1');

    expect(getByTestId(TEST_IDS.CODE_ERROR)).toHaveTextContent(
      strings('rewards.error_messages.something_went_wrong'),
    );

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).toHaveBeenCalledWith('KOL1');
  });

  it('restores the original code when the edit is cancelled', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'zz99');
    fireEvent.press(getByTestId(TEST_IDS.CANCEL_EDIT));
    await advanceDebounce();

    expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
  });

  it.each([
    ['the decline button', ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE],
    ['the header close button', ACCEPT_INVITE_SHEET_TEST_IDS.CLOSE],
  ])(
    'closes the sheet from %s without directly navigating',
    async (_name, testId) => {
      const { getByTestId } = await renderSheet('KOL1');

      fireEvent.press(getByTestId(testId));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockAcceptReferralCode).not.toHaveBeenCalled();

      // The BottomSheet invokes goBack after its closing animation.
      getByTestId(TEST_IDS.CONTAINER).props.goBack();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    },
  );

  it('accepts with the code on screen and leaves dismissal to the hook', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).toHaveBeenCalledWith('KOL1');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('accepts with an edited code', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'ab12cd');
    await advanceDebounce();
    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).toHaveBeenCalledWith('AB12CD');
  });

  it('does not accept while the code is being validated', async () => {
    const { getByTestId } = await renderSheet('KOL1');

    fireEvent.press(getByTestId(TEST_IDS.EDIT_CODE));
    fireEvent.changeText(getByTestId(TEST_IDS.CODE_INPUT), 'ab12cd');

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).not.toHaveBeenCalled();
  });

  it('does not accept a code that is too short to be one', async () => {
    const { getByTestId } = await renderSheet();

    fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

    expect(mockAcceptReferralCode).not.toHaveBeenCalled();
  });

  it('shows the accept action as loading while the registration runs', async () => {
    mockUseAcceptMoneyReferralCode.mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: true,
      errorMessage: '',
      clearError: jest.fn(),
    });

    const { getByTestId } = await renderSheet('KOL1');

    expect(getByTestId(TEST_IDS.ACCEPT).props.accessibilityState).toMatchObject(
      { disabled: true, busy: true },
    );
  });

  it.each([
    ['accept', ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT],
    ['decline', ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE],
    ['close', ACCEPT_INVITE_SHEET_TEST_IDS.CLOSE],
  ])(
    'ignores %s while a registration is already in flight',
    async (_name, testId) => {
      mockUseAcceptMoneyReferralCode.mockReturnValue({
        acceptReferralCode: mockAcceptReferralCode,
        isLoading: true,
        errorMessage: '',
        clearError: jest.fn(),
      });

      const { getByTestId } = await renderSheet('KOL1');

      fireEvent.press(getByTestId(testId));

      expect(mockAcceptReferralCode).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    },
  );

  describe('while the session profile is still resolving', () => {
    it('shows a prefilled code as the headline and never swaps it for an input', async () => {
      const { resolveProfile } = deferSessionProfile();

      const { getByTestId, queryByTestId } = renderSheetSync('KOL1');

      // No copy has arrived yet, so there is no edit affordance to offer —
      // which must not be read as "this code cannot be edited".
      expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
      expect(queryByTestId(TEST_IDS.CODE_INPUT)).toBeNull();
      expect(queryByTestId(TEST_IDS.EDIT_CODE)).toBeNull();

      await resolveProfile();

      expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
      expect(getByTestId(TEST_IDS.EDIT_CODE)).toBeOnTheScreen();
      expect(queryByTestId(TEST_IDS.CODE_INPUT)).toBeNull();
    });

    it('keeps the code editable when the resolved copy has no edit label', async () => {
      referralMeEntries = {
        [PROFILE_ID]: {
          loading: false,
          error: false,
          data: buildReferralMe({
            localized_text: {
              ...LOCALIZED_TEXT,
              inviteUseDifferentCode: '',
            },
          }),
        },
      };
      const { resolveProfile } = deferSessionProfile();

      const { getByTestId, queryByTestId } = renderSheetSync('KOL1');

      expect(queryByTestId(TEST_IDS.CODE_INPUT)).toBeNull();

      await resolveProfile();

      expect(getByTestId(TEST_IDS.CODE_INPUT).props.value).toBe('KOL1');
      expect(queryByTestId(TEST_IDS.CODE)).toBeNull();
    });

    it('keeps the code editable when no profile resolves at all', async () => {
      const { resolveProfile } = deferSessionProfile({ signedOut: true });

      const { getByTestId, queryByTestId } = renderSheetSync('KOL1');

      expect(queryByTestId(TEST_IDS.CODE_INPUT)).toBeNull();

      await resolveProfile();

      expect(getByTestId(TEST_IDS.CODE_INPUT).props.value).toBe('KOL1');
    });

    it('waits for a loading entry before deciding the code is uneditable', async () => {
      referralMeEntries = {
        [PROFILE_ID]: { loading: true, error: false, data: null },
      };
      const { resolveProfile } = deferSessionProfile();

      const { getByTestId, queryByTestId, store } = renderSheetSync('KOL1');
      await resolveProfile();

      expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
      expect(queryByTestId(TEST_IDS.CODE_INPUT)).toBeNull();

      await act(async () => {
        store.dispatch(
          setReferralMe({ profileId: PROFILE_ID, data: buildReferralMe() }),
        );
      });

      expect(getByTestId(TEST_IDS.CODE)).toHaveTextContent('KOL1');
      expect(getByTestId(TEST_IDS.EDIT_CODE)).toBeOnTheScreen();
    });

    it('makes the code editable once a failed entry settles', async () => {
      referralMeEntries = {
        [PROFILE_ID]: { loading: false, error: true, data: null },
      };
      const { resolveProfile } = deferSessionProfile();

      const { getByTestId } = renderSheetSync('KOL1');
      await resolveProfile();

      expect(getByTestId(TEST_IDS.CODE_INPUT).props.value).toBe('KOL1');
    });
  });

  describe('analytics', () => {
    it('tracks Rewards Money Referral Offer Viewed once on mount with the prefilled code', async () => {
      await renderSheet('KOL1');

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_VIEWED,
      );
      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(viewedBuilder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('tracks Rewards Money Referral Offer Viewed without a code when none was prefilled', async () => {
      await renderSheet();

      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(viewedBuilder.addProperties).toHaveBeenCalledWith({});
    });

    it('tracks no offer for an already-referred profile that closes itself', async () => {
      referralMeEntries = {
        [PROFILE_ID]: {
          loading: false,
          error: false,
          data: buildReferralMe({ role: 'REFEREE', variant: 'REFEREE' }),
        },
      };

      renderSheetSync('KOL1');

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('tracks no offer when a pending referral-me load settles as already referred', async () => {
      referralMeEntries = {
        [PROFILE_ID]: { loading: true, error: false, data: null },
      };

      const { store } = await renderSheet('KOL1');

      expect(mockTrackEvent).not.toHaveBeenCalled();

      await act(async () => {
        store.dispatch(
          setReferralMe({
            profileId: PROFILE_ID,
            data: buildReferralMe({ role: 'REFEREE', variant: 'REFEREE' }),
          }),
        );
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('tracks no response when the sheet is dismissed before the offer is viewed', () => {
      referralMeEntries = {
        [PROFILE_ID]: { loading: true, error: false, data: null },
      };

      const { getByTestId } = renderSheetSync('KOL1');

      getByTestId(TEST_IDS.CONTAINER).props.goBack();

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );
      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['decline', TEST_IDS.DECLINE],
      ['close', TEST_IDS.CLOSE],
    ])(
      'does not relabel a pre-view %s as dismissed when closing completes',
      async (_action, testId) => {
        referralMeEntries = {
          [PROFILE_ID]: { loading: true, error: false, data: null },
        };

        const { getByTestId, store } = renderSheetSync('KOL1');

        fireEvent.press(getByTestId(testId));
        expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);

        await act(async () => {
          store.dispatch(
            setReferralMe({ profileId: PROFILE_ID, data: buildReferralMe() }),
          );
        });
        getByTestId(TEST_IDS.CONTAINER).props.goBack();

        expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_VIEWED,
        );
        expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
        );
      },
    );

    it('tracks the offer once a pending referral-me load settles as eligible', async () => {
      referralMeEntries = {
        [PROFILE_ID]: { loading: true, error: false, data: null },
      };

      const { store } = await renderSheet('KOL1');

      expect(mockTrackEvent).not.toHaveBeenCalled();

      await act(async () => {
        store.dispatch(
          setReferralMe({ profileId: PROFILE_ID, data: buildReferralMe() }),
        );
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_VIEWED,
      );
      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(viewedBuilder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('tracks accepted after registration succeeds', async () => {
      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId(TEST_IDS.ACCEPT));
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );
      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action: 'accepted',
      });
      expect(mockAcceptReferralCode).toHaveBeenCalledWith('KOL1');
    });

    it('does not record accepted until registration resolves', async () => {
      let resolveAccept: (didAccept: boolean) => void = () => undefined;
      mockAcceptReferralCode.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveAccept = resolve;
          }),
      );

      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );

      await act(async () => {
        resolveAccept(true);
      });

      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action: 'accepted',
      });
    });

    it.each([
      ['the header close button', TEST_IDS.CLOSE],
      ['the decline button', TEST_IDS.DECLINE],
    ])(
      'keeps accepted as the answer when %s is pressed before the hook reports loading',
      async (_name, testId) => {
        let resolveAccept: (didAccept: boolean) => void = () => undefined;
        mockAcceptReferralCode.mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveAccept = resolve;
            }),
        );

        const { getByTestId } = await renderSheet('KOL1');
        mockTrackEvent.mockClear();
        mockCreateEventBuilder.mockClear();

        // Two taps can reach the handlers before React commits the hook's
        // loading state, and the second one must not answer for the first.
        fireEvent.press(getByTestId(TEST_IDS.ACCEPT));
        fireEvent.press(getByTestId(testId));

        expect(mockCreateEventBuilder).not.toHaveBeenCalled();
        expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();

        await act(async () => {
          resolveAccept(true);
        });

        const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
        expect(builder.addProperties).toHaveBeenCalledWith({
          referral_code: 'KOL1',
          action: 'accepted',
        });
      },
    );

    it.each([
      ['declined', TEST_IDS.DECLINE],
      ['dismissed', TEST_IDS.CLOSE],
    ])('records %s after a refused registration', async (action, testId) => {
      mockAcceptReferralCode.mockResolvedValue(false);

      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId(TEST_IDS.ACCEPT));
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );

      fireEvent.press(getByTestId(testId));

      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action,
      });
    });

    it('tracks declined only from the decline button', async () => {
      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      fireEvent.press(getByTestId(TEST_IDS.DECLINE));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );
      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action: 'declined',
      });
    });

    it('tracks dismissed, not declined, when the header close button is pressed', async () => {
      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      fireEvent.press(getByTestId(TEST_IDS.CLOSE));

      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action: 'dismissed',
      });
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('tracks dismissed, not declined, on a swipe or overlay dismissal', async () => {
      const { getByTestId } = await renderSheet('KOL1');
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      getByTestId(TEST_IDS.CONTAINER).props.goBack();

      const builder = mockCreateEventBuilder.mock.results.at(-1)?.value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        referral_code: 'KOL1',
        action: 'dismissed',
      });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['accepted', TEST_IDS.ACCEPT],
      ['declined', TEST_IDS.DECLINE],
    ])(
      'keeps %s as the answer when the sheet then closes through goBack',
      async (action, testId) => {
        const { getByTestId } = await renderSheet('KOL1');
        mockTrackEvent.mockClear();
        mockCreateEventBuilder.mockClear();

        await act(async () => {
          fireEvent.press(getByTestId(testId));
        });
        getByTestId(TEST_IDS.CONTAINER).props.goBack();

        expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
        const builder = mockCreateEventBuilder.mock.results[0]?.value;
        expect(builder.addProperties).toHaveBeenCalledWith({
          referral_code: 'KOL1',
          action,
        });
        expect(mockGoBack).toHaveBeenCalledTimes(1);
      },
    );

    it('does not track accepted while the Accept button is disabled', async () => {
      const { getByTestId } = await renderSheet();
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      fireEvent.press(getByTestId(TEST_IDS.ACCEPT));

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_RESPONDED,
      );
      expect(mockAcceptReferralCode).not.toHaveBeenCalled();
    });
  });
});
