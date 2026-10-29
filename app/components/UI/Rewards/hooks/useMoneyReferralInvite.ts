import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import {
  canAcceptMoneyReferralInvite,
  selectMoneyReferralAllowedForGeo,
  selectReferralMeEntry,
} from '../../../../reducers/rewardsMoney/selectors';
import { clearPendingReferralCode } from '../../../../reducers/rewardsMoney';
import type { ReferralLocalizedText } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  useAcceptMoneyReferralCode,
  type ReferralRefusalReason,
} from './useAcceptMoneyReferralCode';
import {
  MONEY_REFERRAL_CODE_MAX_LENGTH,
  MONEY_REFERRAL_CODE_MIN_LENGTH,
  useValidateMoneyReferralCode,
} from './useValidateMoneyReferralCode';
import { useGeoRewardsMetadata } from './useGeoRewardsMetadata';

/** Where the invite is shown, reported on every offer interaction. */
export type MoneyReferralInviteLocation = 'invite_sheet' | 'onboarding';

/** A way out of the invite that is the user's answer. */
export type MoneyReferralInviteResponse = 'declined' | 'dismissed';

/** Alphanumeric upper-case only, capped at the Money code max length. */
const normalizeInviteCodeInput = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/gu, '')
    .toUpperCase()
    .slice(0, MONEY_REFERRAL_CODE_MAX_LENGTH);

/**
 * Invite copy, resolved per key.
 *
 * The server owns the invite's words: it fills every `localized_text` key
 * from its own defaults, so a missing key means there is no referral-me
 * payload at all. Only keys that an existing Mobile string already says have
 * a fallback — the invite adds no locale keys.
 */
function useInviteCopy(localizedText: ReferralLocalizedText | undefined) {
  return useMemo(
    () => ({
      title: localizedText?.inviteTitle ?? '',
      body: localizedText?.inviteMessageBody ?? '',
      codeLabel:
        localizedText?.inviteReferralCode ??
        strings('rewards.referral.referral_code'),
      decline:
        localizedText?.inviteDecline ?? strings('rewards.vip.splash_not_now'),
      accept:
        localizedText?.inviteAccept ??
        strings('rewards.vip.referee_splash_continue'),
    }),
    [localizedText],
  );
}

export interface UseMoneyReferralInviteParams {
  /** Code to prefill, from the deeplink or the route. */
  initialReferralCode: string;
  /** Hydra profile whose referral-me entry the invite reads. */
  profileId: string | undefined;
  location: MoneyReferralInviteLocation;
  /**
   * Closes the invite on its own: the profile can no longer accept one, or
   * geo turned out excluded. Any answer is already recorded.
   */
  onAutoDismiss: () => void;
  /** Replaces the accepted splash once registration succeeded. */
  onAccepted?: () => void;
}

/**
 * State and actions shared by every surface that offers a Money referral
 * invite: the invite sheet and the onboarding referral step.
 *
 * Registration belongs to `useAcceptMoneyReferralCode`: a refusal keeps the
 * invite on screen, a success dismisses it. A confirmed geo exclusion closes
 * the invite the same way a non-NONE variant does. Region copy is still kept
 * for edge cases: a race before the dismiss effect runs, and a server GEO
 * refusal when client geo failed open.
 *
 * Whichever way the invite closes, the deeplink code it was opened for is
 * answered and must not prompt again.
 */
export function useMoneyReferralInvite({
  initialReferralCode,
  profileId,
  location,
  onAutoDismiss,
  onAccepted,
}: UseMoneyReferralInviteParams) {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedOfferViewedRef = useRef(false);
  const hasRespondedRef = useRef(false);
  const acceptInFlightRef = useRef(false);
  // Once Accept has been pressed, a late geo exclusion must not close the
  // invite: that would interrupt registerReferee, hide a server region
  // refusal, or pop the accepted splash after a successful navigate.
  const acceptStartedRef = useRef(false);

  const isProfileResolved = Boolean(profileId);
  useGeoRewardsMetadata({ enabled: true });
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const acceptAllowedForGeo = useSelector((state: RootState) =>
    selectMoneyReferralAllowedForGeo(state, profileId),
  );
  const referralMe = referralMeEntry?.data;

  useEffect(
    () => () => {
      dispatch(clearPendingReferralCode());
    },
    [dispatch],
  );

  // Once this invite has shown an eligible offer, accept's own refresh to
  // REFEREE is not a reason to close. Only a first settled payload that
  // already holds REFERRER or REFEREE (stale deeplink) is.
  const hasSeenEligibleInviteRef = useRef(false);
  if (referralMe && canAcceptMoneyReferralInvite(referralMe)) {
    hasSeenEligibleInviteRef.current = true;
  }
  const shouldDismissForReferralVariant =
    referralMe !== null &&
    referralMe !== undefined &&
    !canAcceptMoneyReferralInvite(referralMe) &&
    !hasSeenEligibleInviteRef.current;
  const copy = useInviteCopy(referralMe?.localized_text);
  // A resolved profile with no referral-me row is not a settled invite.
  // `loading` is only set once the fetch starts, so a missing entry would
  // otherwise count as on screen. If that payload then arrives already
  // referred, the invite closes itself and the funnel would keep a viewed
  // event with no answer. Hold until the payload exists.
  const isCopyPending =
    !isProfileResolved ||
    referralMeEntry == null ||
    referralMeEntry.loading ||
    referralMeEntry.data == null;

  const {
    referralCode,
    setReferralCode,
    isValidating,
    isValid,
    isUnknownError,
  } = useValidateMoneyReferralCode(initialReferralCode);
  const {
    acceptReferralCode,
    isLoading: isAccepting,
    errorMessage: registerError,
    refusalReason,
    acceptBlockedUntil,
    clearError,
  } = useAcceptMoneyReferralCode({ onAccepted });

  // Confirmed exclusion only — unknown geo fails open and stays on screen.
  // After Accept has started (or while it is loading), keep the invite
  // mounted so registration and its refusal copy own the outcome.
  const shouldDismissForGeo =
    !acceptAllowedForGeo && !acceptStartedRef.current && !isAccepting;
  const shouldAutoDismiss =
    shouldDismissForReferralVariant || shouldDismissForGeo;

  const hasCodeToValidate =
    referralCode.length >= MONEY_REFERRAL_CODE_MIN_LENGTH;
  // A code the server rejected, as opposed to validation that could not run.
  const isRejectedCode =
    hasCodeToValidate && !isValidating && !isValid && !isUnknownError;
  const geoBlockedMessage = !acceptAllowedForGeo
    ? strings('rewards.onboarding.not_supported_region_description')
    : '';
  const errorMessage =
    registerError ||
    geoBlockedMessage ||
    (isRejectedCode
      ? strings('rewards.error_messages.invalid_referral_code')
      : isUnknownError
        ? strings('rewards.error_messages.something_went_wrong')
        : '');

  // A code that could not be validated is still offered to the server, which
  // is the authority on it; a rejected one would only be refused again.
  const isRateLimited =
    acceptBlockedUntil !== null && Date.now() < acceptBlockedUntil;
  // Geo exclusion disables Accept until the auto-dismiss effect runs, and
  // still gates a press if the invite is briefly still mounted.
  const canAccept =
    hasCodeToValidate &&
    !isValidating &&
    !isRejectedCode &&
    !isAccepting &&
    !isRateLimited &&
    acceptAllowedForGeo;

  // An offer is viewed only once the invite is showing one: never on a
  // payload still in flight, and never for a stale deeplink, an existing
  // referee, or a geo-blocked country, which close themselves without the
  // user seeing an invite. Those closes answer nothing, so a viewed
  // interaction here would have no answer to pair with — unless geo lands
  // after the offer was already viewed, which is answered as dismissed.
  const isOfferOnScreen = !isCopyPending && !shouldAutoDismiss;

  useEffect(() => {
    if (!isOfferOnScreen || hasTrackedOfferViewedRef.current) {
      return;
    }
    hasTrackedOfferViewedRef.current = true;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
      )
        .addProperties({
          interaction_type: 'viewed',
          location,
          ...(initialReferralCode
            ? { referral_code: initialReferralCode }
            : {}),
        })
        .build(),
    );
  }, [
    createEventBuilder,
    initialReferralCode,
    isOfferOnScreen,
    location,
    trackEvent,
  ]);

  // One answer per invite, and the first one recorded is the answer: a close
  // that follows Accept or Decline is the invite acting on that press, not a
  // second interaction. An answer also requires the matching viewed
  // interaction, since the invite can be dismissed while its copy is pending.
  // `refused` is not an answer: the invite stays open, so it does not lock
  // this guard.
  const trackResponded = useCallback(
    (interactionType: 'accepted' | MoneyReferralInviteResponse) => {
      if (hasRespondedRef.current) {
        return;
      }
      hasRespondedRef.current = true;
      if (!hasTrackedOfferViewedRef.current) {
        return;
      }
      const properties: {
        referral_code: string;
        interaction_type: 'accepted' | MoneyReferralInviteResponse;
        location: MoneyReferralInviteLocation;
        refusal_reason?: ReferralRefusalReason;
      } = {
        referral_code: referralCode,
        interaction_type: interactionType,
        location,
      };
      if (
        refusalReason &&
        (interactionType === 'declined' || interactionType === 'dismissed')
      ) {
        properties.refusal_reason = refusalReason;
      }
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
        )
          .addProperties(properties)
          .build(),
      );
    },
    [createEventBuilder, location, referralCode, refusalReason, trackEvent],
  );

  // Failed Accept: the user tried to take the invite and the server turned
  // them away. Does not lock the one-answer guard, so a later answer or
  // another failed Accept can still fire.
  const trackRefused = useCallback(
    (reason: ReferralRefusalReason) => {
      if (!hasTrackedOfferViewedRef.current) {
        return;
      }
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
        )
          .addProperties({
            referral_code: referralCode,
            interaction_type: 'refused',
            location,
            refusal_reason: reason,
          })
          .build(),
      );
    },
    [createEventBuilder, location, referralCode, trackEvent],
  );

  const onChangeReferralCode = useCallback(
    (code: string) => {
      clearError();
      setReferralCode(normalizeInviteCodeInput(code));
    },
    [clearError, setReferralCode],
  );

  /**
   * Records a way out of the invite as the user's answer. Returns false while
   * a registration is in flight: leaving then would leave the write
   * unattended, and the invite is about to dismiss itself.
   */
  const respond = useCallback(
    (interaction: MoneyReferralInviteResponse): boolean => {
      if (isAccepting || acceptInFlightRef.current) {
        return false;
      }
      trackResponded(interaction);
      return true;
    },
    [isAccepting, trackResponded],
  );

  const accept = useCallback(() => {
    if (!canAccept || acceptInFlightRef.current) {
      return;
    }
    // Accept is about to refresh me to REFEREE. Record that this invite was
    // the offer, so that write cannot be read as a stale deeplink.
    hasSeenEligibleInviteRef.current = true;
    acceptStartedRef.current = true;
    // Registration is the accept. A refused write leaves the invite open, so
    // `accepted` must not lock the funnel until the hook reports accepted.
    acceptInFlightRef.current = true;
    acceptReferralCode(referralCode)
      .then((result) => {
        if (result.accepted) {
          trackResponded('accepted');
          return;
        }
        if (result.refusalReason) {
          trackRefused(result.refusalReason);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        acceptInFlightRef.current = false;
      });
  }, [
    acceptReferralCode,
    canAccept,
    referralCode,
    trackRefused,
    trackResponded,
  ]);

  useEffect(() => {
    if (shouldDismissForReferralVariant) {
      // No offer was on screen to answer, so this close is not a response
      // and no viewed was recorded for it.
      onAutoDismiss();
      return;
    }
    if (!shouldDismissForGeo) {
      return;
    }
    // Never close mid-registerReferee. acceptStartedRef also covers a late
    // geo flip after a refused write (keep the region error) or after accept
    // has already navigated away.
    if (isAccepting || acceptInFlightRef.current || acceptStartedRef.current) {
      return;
    }
    // `trackResponded` no-ops when the offer was never viewed (geo known at
    // open). If geo landed after a viewed offer, pair that viewed with
    // dismissed rather than leave the funnel unanswered.
    trackResponded('dismissed');
    onAutoDismiss();
  }, [
    isAccepting,
    onAutoDismiss,
    shouldDismissForGeo,
    shouldDismissForReferralVariant,
    trackResponded,
  ]);

  return {
    copy,
    isCopyPending,
    shouldAutoDismiss,
    referralCode,
    onChangeReferralCode,
    errorMessage,
    canAccept,
    isAccepting,
    accept,
    respond,
  };
}
