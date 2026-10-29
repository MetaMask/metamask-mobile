import React, { useCallback, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { RootState } from '../../../../../reducers';
import {
  selectMoneyReferralAllowedForGeo,
  selectReferralMeEntry,
  selectSettingsReferralAvailable,
} from '../../../../../reducers/rewardsMoney/selectors';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useAcceptMoneyReferralCode } from '../../hooks/useAcceptMoneyReferralCode';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { useReferralMe } from '../../hooks/useReferralMe';
import {
  MONEY_REFERRAL_CODE_MAX_LENGTH,
  MONEY_REFERRAL_CODE_MIN_LENGTH,
  useValidateMoneyReferralCode,
} from '../../hooks/useValidateMoneyReferralCode';
import { REFERRED_BY_CODE_SECTION_TEST_IDS } from './ReferredByCodeSection.testIds';
/** Alphanumeric upper-case only, capped at the Money code max length. */
const normalizeInviteCodeInput = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/gu, '')
    .toUpperCase()
    .slice(0, MONEY_REFERRAL_CODE_MAX_LENGTH);

export interface ReferredByCodeSectionProps {
  /** Divider under the section when account settings follow it. */
  showTrailingDivider?: boolean;
}

/**
 * Money referral code entry for Rewards Settings.
 *
 * A stored `referralMe.referred_by` code is read-only. Otherwise the field
 * validates and submits through the Money hooks. Section copy comes from
 * `referralMe.localized_text`. A successful apply records `accepted`.
 * Opening Settings, and a refused apply, record nothing.
 *
 * Renders nothing when the Money controller is off, or when referral me has
 * no cached payload.
 */
const ReferredByCodeSection: React.FC<ReferredByCodeSectionProps> = ({
  showTrailingDivider = false,
}) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { profileId } = useReferralMe();
  useGeoRewardsMetadata({ enabled: true });
  const settingsReferralAvailable = useSelector(
    selectSettingsReferralAvailable,
  );
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const acceptAllowedForGeo = useSelector((state: RootState) =>
    selectMoneyReferralAllowedForGeo(state, profileId),
  );
  const storedCode =
    referralMeEntry?.data?.referred_by?.referral_code?.trim() ?? '';
  const hasStoredCode = storedCode.length > 0;
  const localizedText = referralMeEntry?.data?.localized_text;

  const {
    referralCode,
    setReferralCode,
    isValidating,
    isValid,
    isUnknownError,
  } = useValidateMoneyReferralCode();
  const {
    acceptReferralCode,
    isLoading: isAccepting,
    errorMessage: registerError,
    acceptBlockedUntil,
    clearError,
  } = useAcceptMoneyReferralCode();

  const hasAcceptedRef = useRef(false);
  const acceptInFlightRef = useRef(false);
  const referralCodeRef = useRef(referralCode);
  referralCodeRef.current = referralCode;

  const hasCodeToValidate =
    referralCode.length >= MONEY_REFERRAL_CODE_MIN_LENGTH;
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
  const isRateLimited =
    acceptBlockedUntil !== null && Date.now() < acceptBlockedUntil;
  const canApply =
    hasCodeToValidate &&
    !isValidating &&
    !isRejectedCode &&
    !isAccepting &&
    !isRateLimited &&
    acceptAllowedForGeo;

  const trackAccepted = useCallback(() => {
    if (hasAcceptedRef.current) {
      return;
    }
    hasAcceptedRef.current = true;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
      )
        .addProperties({
          referral_code: referralCodeRef.current,
          interaction_type: 'accepted',
        })
        .build(),
    );
  }, [createEventBuilder, trackEvent]);

  const handleChangeReferralCode = useCallback(
    (code: string) => {
      clearError();
      setReferralCode(normalizeInviteCodeInput(code));
    },
    [clearError, setReferralCode],
  );

  const handleApply = useCallback(() => {
    if (!canApply || acceptInFlightRef.current) {
      return;
    }
    acceptInFlightRef.current = true;
    acceptReferralCode(referralCode)
      .then((result) => {
        if (result.accepted) {
          trackAccepted();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        acceptInFlightRef.current = false;
      });
  }, [acceptReferralCode, canApply, referralCode, trackAccepted]);

  if (!settingsReferralAvailable || referralMeEntry?.data == null) {
    return null;
  }

  const description = hasStoredCode
    ? (localizedText?.settingsReferralLinkedDescription ?? '')
    : (localizedText?.settingsReferralNotLinkedDescription ?? '');
  const renderStatusIcon = () => {
    if (hasStoredCode) {
      return null;
    }

    if (isValidating || isAccepting) {
      return <ActivityIndicator color={colors.icon.default} />;
    }

    if (errorMessage) {
      return (
        <Icon
          name={IconName.Error}
          size={IconSize.Lg}
          color={IconColor.ErrorDefault}
        />
      );
    }

    return null;
  };

  return (
    <>
      <Box
        testID={REFERRED_BY_CODE_SECTION_TEST_IDS.SECTION}
        twClassName="flex-col px-4"
      >
        <Box twClassName="gap-2 pb-2">
          <Text variant={TextVariant.HeadingMd}>
            {localizedText?.settingsReferralTitle ?? ''}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {description}
          </Text>
        </Box>

        <Box twClassName="pt-3">
          <TextField
            value={hasStoredCode ? storedCode : referralCode}
            onChangeText={hasStoredCode ? undefined : handleChangeReferralCode}
            isDisabled={hasStoredCode || isAccepting}
            isError={!hasStoredCode && Boolean(errorMessage)}
            placeholder={localizedText?.settingsReferralPlaceholder ?? ''}
            endAccessory={renderStatusIcon()}
            inputProps={{
              autoCapitalize: 'characters',
              autoCorrect: false,
              autoComplete: 'off',
              maxLength: MONEY_REFERRAL_CODE_MAX_LENGTH,
              accessibilityLabel: localizedText?.settingsReferralTitle ?? '',
              testID: REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT,
            }}
          />
          {!hasStoredCode && Boolean(errorMessage) && (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default mt-1"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID={REFERRED_BY_CODE_SECTION_TEST_IDS.ERROR}
            >
              {errorMessage}
            </Text>
          )}
        </Box>

        {!hasStoredCode && (
          <Box twClassName="pt-3">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={isAccepting}
              isDisabled={!canApply}
              onPress={handleApply}
              testID={REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY}
            >
              {localizedText?.settingsReferralApply ?? ''}
            </Button>
          </Box>
        )}
      </Box>
      {showTrailingDivider ? <SectionDivider marginVertical={8} /> : null}
    </>
  );
};

export default ReferredByCodeSection;
