import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Label,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import {
  selectMoneyReferralAllowedForGeo,
  selectReferralMeEntry,
} from '../../../../../reducers/rewardsMoney/selectors';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { RewardsMoneyInviteSheetParams } from '../../types/navigation';
import { useSessionProfileId } from '../../hooks/useReferralMe';
import { useAcceptMoneyReferralCode } from '../../hooks/useAcceptMoneyReferralCode';
import {
  MONEY_REFERRAL_CODE_MAX_LENGTH,
  MONEY_REFERRAL_CODE_MIN_LENGTH,
  useValidateMoneyReferralCode,
} from '../../hooks/useValidateMoneyReferralCode';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';

export const ACCEPT_INVITE_SHEET_TEST_IDS = {
  CONTAINER: 'accept-invite-sheet',
  CLOSE: 'accept-invite-sheet-close',
  BODY: 'accept-invite-sheet-body',
  CODE_FIELD: 'accept-invite-sheet-code-field',
  CODE_INPUT: 'accept-invite-sheet-code-input',
  CODE_ERROR: 'accept-invite-sheet-code-error',
  DECLINE: 'accept-invite-sheet-decline',
  ACCEPT: 'accept-invite-sheet-accept',
} as const;

/** Alphanumeric upper-case only, capped at the Money code max length. */
const normalizeInviteCodeInput = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/gu, '')
    .toUpperCase()
    .slice(0, MONEY_REFERRAL_CODE_MAX_LENGTH);

/**
 * Invite copy, resolved per key.
 *
 * The server owns this screen's words: it fills every `localized_text` key
 * from its own defaults, so a missing key means there is no referral-me
 * payload at all. Only keys that an existing Mobile string already says have
 * a fallback — this screen adds no locale keys.
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

export interface AcceptInviteSheetProps {
  route: {
    params?: RewardsMoneyInviteSheetParams;
  };
}

/**
 * Root modal for accepting a Money referral invite.
 *
 * Opened for `variant: NONE` callers. Registration belongs to
 * `useAcceptMoneyReferralCode`: it keeps the sheet open on a refusal and
 * dismisses it itself once the role has been read back.
 *
 * Header close / swipe / overlay dismiss without declining; the Decline CTA
 * is the explicit declined path.
 */
const AcceptInviteSheet: React.FC<AcceptInviteSheetProps> = ({ route }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const initialReferralCode = route.params?.referralCode ?? '';
  const hasTrackedOfferViewedRef = useRef(false);
  const hasRespondedRef = useRef(false);
  const acceptInFlightRef = useRef(false);

  const { profileId, isResolved: isProfileResolved } = useSessionProfileId();
  useGeoRewardsMetadata({ enabled: true });
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const acceptAllowedForGeo = useSelector((state: RootState) =>
    selectMoneyReferralAllowedForGeo(state, profileId),
  );
  const referralMe = referralMeEntry?.data;
  // Once this sheet has shown an eligible invite, accept's own refresh to
  // REFEREE/REFERRER is not a reason to pop. Only a first settled variant
  // that was already not NONE (stale deeplink, already referred) is.
  const hasSeenEligibleInviteRef = useRef(false);
  if (referralMe?.variant === 'NONE') {
    hasSeenEligibleInviteRef.current = true;
  }
  const shouldDismissForReferralVariant =
    referralMe !== null &&
    referralMe !== undefined &&
    referralMe.variant !== 'NONE' &&
    !hasSeenEligibleInviteRef.current;
  const copy = useInviteCopy(referralMe?.localized_text);
  // Copy is keyed by a profile id that resolves asynchronously, and the
  // entry can still be loading after that. Until both have settled, an
  // absent invite is not a decision this sheet can track.
  const isCopyPending = !isProfileResolved || Boolean(referralMeEntry?.loading);

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
    acceptBlockedUntil,
    clearError,
  } = useAcceptMoneyReferralCode();

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
  // Geo exclusion disables Accept and surfaces through the same field error.
  const canAccept =
    hasCodeToValidate &&
    !isValidating &&
    !isRejectedCode &&
    !isAccepting &&
    !isRateLimited &&
    acceptAllowedForGeo;

  // An offer is viewed only once this sheet is showing one: never on a
  // payload still in flight, and never for a stale deeplink or an existing
  // referee, which close themselves without the user seeing an invite. Those
  // closes answer nothing, so a viewed interaction here would have no answer
  // to pair with.
  const isOfferOnScreen = !isCopyPending && !shouldDismissForReferralVariant;

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
          ...(initialReferralCode
            ? { referral_code: initialReferralCode }
            : {}),
        })
        .build(),
    );
  }, [createEventBuilder, initialReferralCode, isOfferOnScreen, trackEvent]);

  // One answer per sheet, and the first one recorded is the answer: a close
  // that follows Accept or Decline is the sheet acting on that press, not a
  // second interaction. An answer also requires the matching viewed
  // interaction, since the sheet can be dismissed while its copy is pending.
  const trackResponded = useCallback(
    (interactionType: 'accepted' | 'declined' | 'dismissed') => {
      if (hasRespondedRef.current) {
        return;
      }
      hasRespondedRef.current = true;
      if (!hasTrackedOfferViewedRef.current) {
        return;
      }
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
        )
          .addProperties({
            referral_code: referralCode,
            interaction_type: interactionType,
          })
          .build(),
      );
    },
    [createEventBuilder, referralCode, trackEvent],
  );

  const handleChangeReferralCode = useCallback(
    (code: string) => {
      clearError();
      setReferralCode(normalizeInviteCodeInput(code));
    },
    [clearError, setReferralCode],
  );

  // Only this button refuses the invite. Every other way out of the sheet
  // leaves the offer standing, so it reports `dismissed` instead.
  const handleDecline = useCallback(() => {
    // Dismissing mid-registration would leave the write unattended, and it is
    // about to dismiss the sheet itself.
    if (isAccepting || acceptInFlightRef.current) {
      return;
    }
    trackResponded('declined');
    sheetRef.current?.onCloseBottomSheet();
  }, [isAccepting, trackResponded]);

  const handleClose = useCallback(() => {
    if (isAccepting || acceptInFlightRef.current) {
      return;
    }
    trackResponded('dismissed');
    sheetRef.current?.onCloseBottomSheet();
  }, [isAccepting, trackResponded]);

  const handleAccept = useCallback(() => {
    if (!canAccept || acceptInFlightRef.current) {
      return;
    }
    // Accept is about to refresh me to a non-NONE variant. Record that this
    // sheet was the invite, so that write cannot be read as a stale deeplink.
    hasSeenEligibleInviteRef.current = true;
    // Registration is the accept. A refused write leaves the sheet open, so
    // `accepted` must not lock the funnel until the hook returns true.
    acceptInFlightRef.current = true;
    acceptReferralCode(referralCode)
      .then((didAccept) => {
        if (didAccept) {
          trackResponded('accepted');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        acceptInFlightRef.current = false;
      });
  }, [acceptReferralCode, canAccept, referralCode, trackResponded]);

  const handleGoBack = useCallback(() => {
    if (isAccepting || acceptInFlightRef.current) {
      return;
    }
    // Reached by a swipe, the overlay and hardware back, and also by the sheet
    // finishing a close this screen asked for — which the one-answer guard
    // above is what keeps from overwriting that answer.
    trackResponded('dismissed');
    navigation.goBack();
  }, [isAccepting, navigation, trackResponded]);

  useEffect(() => {
    if (shouldDismissForReferralVariant) {
      // Deliberately not `handleGoBack`: no offer was on screen to answer, so
      // this close is not a response and no viewed was recorded for it.
      navigation.goBack();
    }
  }, [navigation, shouldDismissForReferralVariant]);

  // `variant` is the server's product decision for whether this profile may
  // accept an invite. Do not flash an unusable invite while closing a stale
  // deeplink for an existing referrer or referee.
  if (shouldDismissForReferralVariant) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: ACCEPT_INVITE_SHEET_TEST_IDS.CLOSE }}
      >
        {copy.title}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        {Boolean(copy.body) && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={ACCEPT_INVITE_SHEET_TEST_IDS.BODY}
          >
            {copy.body}
          </Text>
        )}
        <Box
          twClassName="mt-4 mb-6 flex flex-col gap-y-2"
          testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE_FIELD}
        >
          <Label fontWeight={FontWeight.Medium}>{copy.codeLabel}</Label>
          <TextField
            value={referralCode}
            onChangeText={handleChangeReferralCode}
            isDisabled={isAccepting}
            isError={Boolean(errorMessage)}
            autoFocus={referralCode.length === 0}
            inputProps={{
              autoCapitalize: 'characters',
              autoCorrect: false,
              autoComplete: 'off',
              maxLength: MONEY_REFERRAL_CODE_MAX_LENGTH,
              accessibilityLabel: copy.codeLabel,
              testID: ACCEPT_INVITE_SHEET_TEST_IDS.CODE_INPUT,
            }}
          />
          {Boolean(errorMessage) && (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default mt-1"
              testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR}
            >
              {errorMessage}
            </Text>
          )}
        </Box>
      </Box>
      <Box twClassName="gap-3 px-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting}
          isDisabled={!canAccept}
          onPress={handleAccept}
          testID={ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT}
        >
          {copy.accept}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={isAccepting}
          onPress={handleDecline}
          testID={ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE}
        >
          {copy.decline}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default AcceptInviteSheet;
