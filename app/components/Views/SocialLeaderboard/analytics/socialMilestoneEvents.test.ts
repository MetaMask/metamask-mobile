import { renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService/XAuthError';
import {
  SocialEvent,
  type SocialUIInteractionProperties,
} from './socialEvents';
import {
  getSocialInteractionMilestones,
  getSocialScreenViewedMilestones,
  getSocialTraderFollowMilestone,
  getXSignInFailureReason,
} from './socialMilestoneEvents';
import { useSocialAnalytics } from './useSocialV1Analytics';

const { Interaction, Outcome, Path, Screen, Step, Tab, Trade } = SocialEvent;

const mockTrack = jest.fn();
let mockIsSocialV1Enabled = true;

jest.mock('react-redux', () => ({
  useSelector: () => mockIsSocialV1Enabled,
}));
jest.mock('./useSocialLeaderboardAnalytics', () => ({
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));

const onboardingInteraction = (
  properties: Omit<SocialUIInteractionProperties, 'screen_name'>,
): SocialUIInteractionProperties => ({
  screen_name: Screen.PROFILE_ONBOARDING,
  ...properties,
});

describe('getSocialInteractionMilestones', () => {
  it('reports the intro Connect X tap as X sign-in started', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.BUTTON_CLICKED,
          step: Step.INTRO,
          path: Path.X,
        }),
      ),
    ).toEqual([
      { event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_STARTED, properties: {} },
    ]);
  });

  it('does not report the manual intro tap as X sign-in started', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.BUTTON_CLICKED,
          step: Step.INTRO,
          path: Path.MANUAL,
        }),
      ),
    ).toEqual([]);
  });

  it('reports the close button as onboarding dismissed with the step', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.BUTTON_CLICKED,
          outcome: Outcome.DISMISSED,
          step: Step.USERNAME,
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_ONBOARDING_DISMISSED,
        properties: { step: Step.USERNAME, exit_method: 'close' },
      },
    ]);
  });

  it('reports terms agreement as terms accepted with the terms version', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.BUTTON_CLICKED,
          outcome: Outcome.SUCCESS,
          step: Step.TERMS,
          path: Path.X,
          terms_version: '2026-01',
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_TERMS_ACCEPTED,
        properties: { path: Path.X, terms_version: '2026-01' },
      },
    ]);
  });

  it('reports a completed X sign-in', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.X_SIGN_IN,
          outcome: Outcome.SUCCESS,
          path: Path.X,
          step: Step.INTRO,
        }),
      ),
    ).toEqual([
      { event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_COMPLETED, properties: {} },
    ]);
  });

  it('reports a cancelled X sign-in without an error event', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.X_SIGN_IN,
          outcome: Outcome.CANCELLED,
          path: Path.X,
          step: Step.INTRO,
        }),
      ),
    ).toEqual([
      { event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_CANCELLED, properties: {} },
    ]);
  });

  it('reports a failed X sign-in with its reason and an x_auth error', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.X_SIGN_IN,
          outcome: Outcome.FAILED,
          path: Path.X,
          step: Step.INTRO,
          failure_reason: 'network',
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_FAILED,
        properties: { failure_reason: 'network' },
      },
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: { error_area: 'x_auth', failure_reason: 'network' },
      },
    ]);
  });

  it('falls back to an unknown reason when a failed X sign-in has none', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.X_SIGN_IN,
          outcome: Outcome.FAILED,
          path: Path.X,
          step: Step.INTRO,
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_FAILED,
        properties: { failure_reason: 'unknown' },
      },
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: { error_area: 'x_auth', failure_reason: 'unknown' },
      },
    ]);
  });

  it('reports a step view with its path', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.STEP_VIEWED,
          step: Step.AVATAR,
          path: Path.X,
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_ONBOARDING_STEP_VIEWED,
        properties: { step: Step.AVATAR, path: Path.X },
      },
    ]);
  });

  it('omits the path from a step view on the intro step', () => {
    const [emission] = getSocialInteractionMilestones(
      onboardingInteraction({
        interaction_type: Interaction.STEP_VIEWED,
        step: Step.INTRO,
      }),
    );

    expect(emission.properties).toEqual({ step: Step.INTRO });
    expect(emission.properties).not.toHaveProperty('path');
  });

  it('reports a successful profile claim as profile created', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.USERNAME_CLAIMED,
          outcome: Outcome.SUCCESS,
          path: Path.X,
          uses_x_username: true,
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_PROFILE_CREATED,
        properties: {
          path: Path.X,
          uses_x_username: true,
          has_social_profile: true,
        },
      },
    ]);
  });

  it('omits uses_x_username from profile created when it was not sent', () => {
    const [emission] = getSocialInteractionMilestones(
      onboardingInteraction({
        interaction_type: Interaction.USERNAME_CLAIMED,
        outcome: Outcome.SUCCESS,
        path: Path.MANUAL,
      }),
    );

    expect(emission.properties).toEqual({
      path: Path.MANUAL,
      has_social_profile: true,
    });
    expect(emission.properties).not.toHaveProperty('uses_x_username');
  });

  it('reports a failed profile claim with its reason and a profile_save error', () => {
    expect(
      getSocialInteractionMilestones(
        onboardingInteraction({
          interaction_type: Interaction.USERNAME_CLAIMED,
          outcome: Outcome.FAILED,
          path: Path.MANUAL,
          profile_save_failure_reason: 'username_taken',
        }),
      ),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_PROFILE_CREATION_FAILED,
        properties: { path: Path.MANUAL, failure_reason: 'username_taken' },
      },
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: {
          error_area: 'profile_save',
          failure_reason: 'username_taken',
        },
      },
    ]);
  });

  it('falls back to an unknown reason when a failed profile claim has none', () => {
    const emissions = getSocialInteractionMilestones(
      onboardingInteraction({
        interaction_type: Interaction.USERNAME_CLAIMED,
        outcome: Outcome.FAILED,
        path: Path.MANUAL,
      }),
    );

    expect(emissions[0]).toEqual({
      event: MetaMetricsEvents.SOCIAL_PROFILE_CREATION_FAILED,
      properties: { path: Path.MANUAL, failure_reason: 'unknown' },
    });
  });

  it('reports a submitted post with its composer context', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.POST_SUBMITTED,
        screen_name: Screen.POST_COMPOSER,
        outcome: Outcome.SUCCESS,
        composer_entry: 'social_feed',
        trade_type: Trade.PERPS,
        has_gif: false,
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_POST_SUBMITTED,
        properties: {
          composer_entry: 'social_feed',
          trade_type: Trade.PERPS,
          has_gif: false,
        },
      },
    ]);
  });

  it('reports the source and post of a submitted post', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.POST_SUBMITTED,
        screen_name: Screen.POST_COMPOSER,
        outcome: Outcome.SUCCESS,
        source: SocialEvent.Source.SOCIAL_TRENDING,
        post_id: 'comment-1',
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_POST_SUBMITTED,
        properties: {
          source: SocialEvent.Source.SOCIAL_TRENDING,
          post_id: 'comment-1',
        },
      },
    ]);
  });

  it('reports a submitted perps copy trade as one unified copy-trade event', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.COPY_TRADE_SUBMITTED,
        screen_name: Screen.TRADER_PROFILE,
        trade_type: Trade.PERPS,
        source: SocialEvent.Source.TRADER_PROFILE,
        asset: 'ETH',
        direction: SocialEvent.Direction.LONG,
        amount_usd: 50,
        metamask_fee: 0.5,
        order_id: 'order-1',
        post_id: 'comment-1',
        author_trader_id: 'trader-1',
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_COPY_TRADE_SUBMITTED,
        properties: {
          trade_type: Trade.PERPS,
          screen_name: Screen.TRADER_PROFILE,
          source: SocialEvent.Source.TRADER_PROFILE,
          asset: 'ETH',
          direction: SocialEvent.Direction.LONG,
          amount_usd: 50,
          metamask_fee: 0.5,
          order_id: 'order-1',
          post_id: 'comment-1',
          author_trader_id: 'trader-1',
        },
      },
    ]);
  });

  it('reports a failed post as a post error', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.POST_FAILED,
        screen_name: Screen.POST_COMPOSER,
        outcome: Outcome.FAILED,
        failure_reason: 'timeout',
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: { error_area: 'post', failure_reason: 'timeout' },
      },
    ]);
  });

  it('reports a copy trade tap with the post it came from', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.COPY_TRADE_TAPPED,
        screen_name: Screen.TRADER_PROFILE,
        tab_name: undefined,
        trade_type: Trade.SPOT,
        post_id: 'post-1',
        author_trader_id: 'trader-1',
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_COPY_TRADE_TAPPED,
        properties: {
          screen_name: Screen.TRADER_PROFILE,
          trade_type: Trade.SPOT,
          post_id: 'post-1',
          author_trader_id: 'trader-1',
        },
      },
    ]);
  });

  it('reports nothing for an interaction with no milestone', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.TAP,
        screen_name: Screen.TRENDING,
        tab_name: Tab.TRENDING,
      }),
    ).toEqual([]);
  });

  it('ignores onboarding-only interactions sent from other screens', () => {
    expect(
      getSocialInteractionMilestones({
        interaction_type: Interaction.BUTTON_CLICKED,
        screen_name: Screen.TRENDING,
        outcome: Outcome.SUCCESS,
        step: Step.TERMS,
      }),
    ).toEqual([]);
  });
});

describe('getSocialScreenViewedMilestones', () => {
  it('reports the onboarding screen as onboarding viewed', () => {
    expect(
      getSocialScreenViewedMilestones({
        screen_name: Screen.PROFILE_ONBOARDING,
        outcome: Outcome.CONTENT,
      }),
    ).toEqual([
      { event: MetaMetricsEvents.SOCIAL_ONBOARDING_VIEWED, properties: {} },
    ]);
  });

  it('includes the source of the onboarding view when there is one', () => {
    expect(
      getSocialScreenViewedMilestones({
        screen_name: Screen.PROFILE_ONBOARDING,
        source: SocialEvent.Source.TRADER_PROFILE,
        outcome: Outcome.CONTENT,
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_ONBOARDING_VIEWED,
        properties: { source: SocialEvent.Source.TRADER_PROFILE },
      },
    ]);
  });

  it('reports an errored screen as a screen_load error', () => {
    expect(
      getSocialScreenViewedMilestones({
        screen_name: Screen.TRENDING,
        tab_name: Tab.TRENDING,
        outcome: Outcome.ERROR,
      }),
    ).toEqual([
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: { error_area: 'screen_load' },
      },
    ]);
  });

  it('reports nothing for an ordinary screen view', () => {
    expect(
      getSocialScreenViewedMilestones({
        screen_name: Screen.TRENDING,
        tab_name: Tab.TRENDING,
        outcome: Outcome.CONTENT,
      }),
    ).toEqual([]);
  });
});

describe('getXSignInFailureReason', () => {
  it.each([
    [XAuthErrorType.NetworkFailure, 'network'],
    [XAuthErrorType.StateMismatch, 'state_mismatch'],
    [XAuthErrorType.MissingCode, 'missing_code'],
    [XAuthErrorType.BackendError, 'backend_error'],
    [XAuthErrorType.NotSignedIn, 'not_signed_in'],
    [XAuthErrorType.NoEvmAccount, 'no_evm_account'],
  ])('maps %s to %s', (type, reason) => {
    expect(getXSignInFailureReason(new XAuthError(type, 'failed'))).toBe(
      reason,
    );
  });

  it('maps errors that are not XAuthError to unknown', () => {
    expect(getXSignInFailureReason(new Error('boom'))).toBe('unknown');
  });
});

describe('getSocialTraderFollowMilestone', () => {
  it('reports a follow with its source', () => {
    expect(getSocialTraderFollowMilestone('follow', 'trader_profile')).toEqual({
      event: MetaMetricsEvents.SOCIAL_TRADER_FOLLOWED,
      properties: { source: 'trader_profile' },
    });
  });

  it('reports an unfollow with its source', () => {
    expect(getSocialTraderFollowMilestone('unfollow', 'leaderboard')).toEqual({
      event: MetaMetricsEvents.SOCIAL_TRADER_UNFOLLOWED,
      properties: { source: 'leaderboard' },
    });
  });
});

describe('useSocialAnalytics milestone emission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialV1Enabled = true;
  });

  it('emits the legacy event and the milestone for one interaction', () => {
    const { result } = renderHook(() => useSocialAnalytics());

    result.current.trackInteraction(
      onboardingInteraction({
        interaction_type: Interaction.X_SIGN_IN,
        outcome: Outcome.CANCELLED,
        path: Path.X,
        step: Step.INTRO,
      }),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      expect.objectContaining({ interaction_type: Interaction.X_SIGN_IN }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_X_SIGN_IN_CANCELLED,
      expect.any(Object),
    );
  });

  it('emits nothing when the Social V1 treatment is inactive', () => {
    mockIsSocialV1Enabled = false;
    const { result } = renderHook(() => useSocialAnalytics());

    result.current.trackInteraction(
      onboardingInteraction({
        interaction_type: Interaction.X_SIGN_IN,
        outcome: Outcome.CANCELLED,
        path: Path.X,
        step: Step.INTRO,
      }),
    );
    result.current.trackMilestone({
      event: MetaMetricsEvents.SOCIAL_ONBOARDING_DISMISSED,
      properties: { exit_method: 'close' },
    });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('emits the screen view milestone next to the legacy screen view', () => {
    const { result } = renderHook(() => useSocialAnalytics());

    result.current.trackScreenViewed({
      screen_name: Screen.PROFILE_ONBOARDING,
      outcome: Outcome.CONTENT,
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
      expect.objectContaining({ screen_name: Screen.PROFILE_ONBOARDING }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_ONBOARDING_VIEWED,
      expect.any(Object),
    );
  });
});
