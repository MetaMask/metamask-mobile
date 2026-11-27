import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService/XAuthError';
import {
  SOCIAL_X_SIGN_IN_FAILURE_REASONS,
  SocialEvent,
  type SocialComposerEntry,
  type SocialDirection,
  type SocialErrorArea,
  type SocialEventSource,
  type SocialFailureReason,
  type SocialOnboardingPath,
  type SocialOnboardingStep,
  type SocialScreenName,
  type SocialScreenViewedProperties,
  type SocialTabName,
  type SocialTradeType,
  type SocialUIInteractionProperties,
  type SocialXSignInFailureReason,
} from './socialEvents';
import type { TraderFollowInteractionSource } from './socialLeaderboardEvents';

/**
 * Social V1 milestone events (TSA-1860). Each one is derived from a generic
 * event the app already sends, or from a call site that passes the extra
 * data. The legacy generic events are kept alongside them.
 *
 * TODO(TSA-1860): remove the legacy generic events (`Social UI Interaction`,
 * `Social Screen Viewed`) once dashboards and funnels read the milestones.
 */

/** One milestone event and the properties it carries. */
export type SocialMilestoneEmission =
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_ONBOARDING_VIEWED'];
      properties: { source?: SocialEventSource };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_ONBOARDING_STEP_VIEWED'];
      properties: { step: SocialOnboardingStep; path?: SocialOnboardingPath };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_ONBOARDING_DISMISSED'];
      properties: {
        step?: SocialOnboardingStep;
        exit_method: 'close' | 'back' | 'swipe';
      };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_TERMS_ACCEPTED'];
      properties: { path?: SocialOnboardingPath; terms_version?: string };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_X_SIGN_IN_STARTED'];
      properties: Record<string, never>;
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_X_SIGN_IN_COMPLETED'];
      properties: Record<string, never>;
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_X_SIGN_IN_CANCELLED'];
      properties: Record<string, never>;
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_X_SIGN_IN_FAILED'];
      properties: { failure_reason: SocialXSignInFailureReason };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_PROFILE_CREATED'];
      properties: {
        path?: SocialOnboardingPath;
        uses_x_username?: boolean;
        has_social_profile: true;
      };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_PROFILE_CREATION_FAILED'];
      properties: {
        path?: SocialOnboardingPath;
        failure_reason: SocialFailureReason;
      };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_POST_SUBMITTED'];
      properties: {
        composer_entry?: SocialComposerEntry;
        trade_type?: SocialTradeType;
        has_gif?: boolean;
        source?: SocialEventSource;
        post_id?: string;
      };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_COPY_TRADE_SUBMITTED'];
      properties: {
        trade_type: SocialTradeType;
        screen_name?: SocialScreenName;
        source?: SocialEventSource;
        asset?: string;
        direction?: SocialDirection;
        amount_usd?: number;
        metamask_fee?: number;
        order_id?: string;
        post_id?: string;
        author_trader_id?: string;
      };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_COPY_TRADE_TAPPED'];
      properties: {
        screen_name: SocialScreenName;
        trade_type?: SocialTradeType;
        tab_name?: SocialTabName;
        post_id?: string;
        author_trader_id?: string;
      };
    }
  | {
      event:
        | (typeof MetaMetricsEvents)['SOCIAL_TRADER_FOLLOWED']
        | (typeof MetaMetricsEvents)['SOCIAL_TRADER_UNFOLLOWED'];
      properties: { source: TraderFollowInteractionSource };
    }
  | {
      event: (typeof MetaMetricsEvents)['SOCIAL_ERROR_OCCURRED'];
      properties: {
        error_area: SocialErrorArea;
        failure_reason?: SocialFailureReason;
      };
    };

/** Drops keys whose value is `undefined`, so optional fields are not sent. */
const definedOnly = <T extends Record<string, unknown>>(props: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

const isXSignInFailureReason = (
  value: unknown,
): value is SocialXSignInFailureReason =>
  typeof value === 'string' &&
  (SOCIAL_X_SIGN_IN_FAILURE_REASONS as readonly string[]).includes(value);

const X_AUTH_ERROR_REASONS: Record<XAuthErrorType, SocialXSignInFailureReason> =
  {
    // A cancelled sign-in is tracked as `Social X Sign In Cancelled`, not here.
    [XAuthErrorType.UserCancelled]: 'unknown',
    [XAuthErrorType.NetworkFailure]: 'network',
    [XAuthErrorType.StateMismatch]: 'state_mismatch',
    [XAuthErrorType.MissingCode]: 'missing_code',
    [XAuthErrorType.BackendError]: 'backend_error',
    [XAuthErrorType.NotSignedIn]: 'not_signed_in',
    [XAuthErrorType.NoEvmAccount]: 'no_evm_account',
  };

/** Coarse, closed-enum reason for a failed profile-onboarding X sign-in. */
export const getXSignInFailureReason = (
  error: unknown,
): SocialXSignInFailureReason =>
  error instanceof XAuthError ? X_AUTH_ERROR_REASONS[error.type] : 'unknown';

const { Interaction, Outcome, Path, Screen, Step } = SocialEvent;

const getInteractionMilestones = (
  properties: SocialUIInteractionProperties,
): SocialMilestoneEmission[] => {
  const isOnboarding = properties.screen_name === Screen.PROFILE_ONBOARDING;

  switch (properties.interaction_type) {
    case Interaction.BUTTON_CLICKED: {
      if (!isOnboarding) {
        return [];
      }
      // The onboarding close (X) button is the only sender of this outcome.
      if (properties.outcome === Outcome.DISMISSED) {
        return [
          {
            event: MetaMetricsEvents.SOCIAL_ONBOARDING_DISMISSED,
            properties: {
              ...definedOnly({ step: properties.step }),
              exit_method: 'close',
            },
          },
        ];
      }
      if (
        properties.step === Step.TERMS &&
        properties.outcome === Outcome.SUCCESS
      ) {
        return [
          {
            event: MetaMetricsEvents.SOCIAL_TERMS_ACCEPTED,
            properties: definedOnly({
              path: properties.path,
              terms_version: properties.terms_version,
            }),
          },
        ];
      }
      // The intro "Connect X" tap. The manual path does not start X sign-in.
      if (
        properties.step === Step.INTRO &&
        properties.path === Path.X &&
        properties.outcome === undefined
      ) {
        return [
          {
            event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_STARTED,
            properties: {},
          },
        ];
      }
      return [];
    }

    case Interaction.X_SIGN_IN: {
      if (!isOnboarding) {
        return [];
      }
      switch (properties.outcome) {
        case Outcome.SUCCESS:
          return [
            {
              event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_COMPLETED,
              properties: {},
            },
          ];
        case Outcome.CANCELLED:
          return [
            {
              event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_CANCELLED,
              properties: {},
            },
          ];
        case Outcome.FAILED: {
          const failure_reason = isXSignInFailureReason(
            properties.failure_reason,
          )
            ? properties.failure_reason
            : 'unknown';
          return [
            {
              event: MetaMetricsEvents.SOCIAL_X_SIGN_IN_FAILED,
              properties: { failure_reason },
            },
            {
              event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
              properties: { error_area: 'x_auth', failure_reason },
            },
          ];
        }
        default:
          return [];
      }
    }

    case Interaction.STEP_VIEWED:
      if (!isOnboarding || !properties.step) {
        return [];
      }
      return [
        {
          event: MetaMetricsEvents.SOCIAL_ONBOARDING_STEP_VIEWED,
          properties: {
            step: properties.step,
            ...definedOnly({ path: properties.path }),
          },
        },
      ];

    case Interaction.USERNAME_CLAIMED: {
      if (properties.outcome === Outcome.SUCCESS) {
        return [
          {
            event: MetaMetricsEvents.SOCIAL_PROFILE_CREATED,
            properties: {
              ...definedOnly({
                path: properties.path,
                uses_x_username: properties.uses_x_username,
              }),
              // The profile now exists, even if the linked account has not
              // synced to state yet.
              has_social_profile: true,
            },
          },
        ];
      }
      if (properties.outcome === Outcome.FAILED) {
        const failure_reason: SocialFailureReason =
          properties.profile_save_failure_reason ?? 'unknown';
        return [
          {
            event: MetaMetricsEvents.SOCIAL_PROFILE_CREATION_FAILED,
            properties: {
              ...definedOnly({ path: properties.path }),
              failure_reason,
            },
          },
          {
            event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
            properties: { error_area: 'profile_save', failure_reason },
          },
        ];
      }
      return [];
    }

    case Interaction.POST_SUBMITTED:
      return [
        {
          event: MetaMetricsEvents.SOCIAL_POST_SUBMITTED,
          properties: definedOnly({
            composer_entry: properties.composer_entry,
            trade_type: properties.trade_type,
            has_gif: properties.has_gif,
            source: properties.source,
            post_id: properties.post_id,
          }),
        },
      ];

    case Interaction.COPY_TRADE_SUBMITTED:
      // Perps copy trades. Spot copy trades are emitted from Quick Buy.
      return [
        {
          event: MetaMetricsEvents.SOCIAL_COPY_TRADE_SUBMITTED,
          properties: definedOnly({
            trade_type: properties.trade_type ?? SocialEvent.Trade.PERPS,
            screen_name: properties.screen_name,
            source: properties.source,
            asset: properties.asset,
            direction: properties.direction,
            amount_usd: properties.amount_usd,
            metamask_fee: properties.metamask_fee,
            order_id: properties.order_id,
            post_id: properties.post_id,
            author_trader_id: properties.author_trader_id,
          }),
        },
      ];

    case Interaction.POST_FAILED:
      return [
        {
          event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
          properties: {
            error_area: 'post',
            failure_reason: properties.failure_reason ?? 'unknown',
          },
        },
      ];

    case Interaction.COPY_TRADE_TAPPED:
      return [
        {
          event: MetaMetricsEvents.SOCIAL_COPY_TRADE_TAPPED,
          properties: {
            screen_name: properties.screen_name,
            ...definedOnly({
              trade_type: properties.trade_type,
              tab_name: properties.tab_name,
              post_id: properties.post_id,
              author_trader_id: properties.author_trader_id,
            }),
          },
        },
      ];

    default:
      return [];
  }
};

/** Milestones for one generic `Social UI Interaction`. Pure, so it is unit tested. */
export const getSocialInteractionMilestones = (
  properties: SocialUIInteractionProperties,
): SocialMilestoneEmission[] => getInteractionMilestones(properties);

/** Milestones for one `Social Screen Viewed`. */
export const getSocialScreenViewedMilestones = (
  properties: SocialScreenViewedProperties,
): SocialMilestoneEmission[] => {
  if (properties.outcome === Outcome.ERROR) {
    return [
      {
        event: MetaMetricsEvents.SOCIAL_ERROR_OCCURRED,
        properties: { error_area: 'screen_load' },
      },
    ];
  }
  if (properties.screen_name === Screen.PROFILE_ONBOARDING) {
    return [
      {
        event: MetaMetricsEvents.SOCIAL_ONBOARDING_VIEWED,
        properties: definedOnly({ source: properties.source }),
      },
    ];
  }
  return [];
};

/**
 * Milestone for a follow or unfollow. Callers emit it only on the Social V1
 * treatment, because the legacy `Trader Follow Interaction` event is shared by
 * every arm.
 */
export const getSocialTraderFollowMilestone = (
  action: 'follow' | 'unfollow',
  source: TraderFollowInteractionSource,
): SocialMilestoneEmission =>
  action === 'follow'
    ? {
        event: MetaMetricsEvents.SOCIAL_TRADER_FOLLOWED,
        properties: { source },
      }
    : {
        event: MetaMetricsEvents.SOCIAL_TRADER_UNFOLLOWED,
        properties: { source },
      };
