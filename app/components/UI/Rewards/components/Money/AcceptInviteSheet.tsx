import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Label,
  Text,
  TextButton,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import { selectReferralMeEntry } from '../../../../../reducers/rewardsMoney/selectors';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { RewardsMoneyInviteSheetParams } from '../../types/navigation';
import RewardsThemeImageComponent from '../ThemeImageComponent/RewardsThemeImageComponent';
import { useSessionProfileId } from '../../hooks/useReferralMe';
import { useAcceptMoneyReferralCode } from '../../hooks/useAcceptMoneyReferralCode';
import {
  MONEY_REFERRAL_CODE_MAX_LENGTH,
  MONEY_REFERRAL_CODE_MIN_LENGTH,
  useValidateMoneyReferralCode,
} from '../../hooks/useValidateMoneyReferralCode';

export const ACCEPT_INVITE_SHEET_TEST_IDS = {
  CONTAINER: 'accept-invite-sheet',
  CLOSE: 'accept-invite-sheet-close',
  HERO: 'accept-invite-sheet-hero',
  BODY: 'accept-invite-sheet-body',
  CODE_FIELD: 'accept-invite-sheet-code-field',
  CODE: 'accept-invite-sheet-code',
  EDIT_CODE: 'accept-invite-sheet-edit-code',
  CODE_INPUT: 'accept-invite-sheet-code-input',
  CODE_VALID: 'accept-invite-sheet-code-valid',
  CODE_ERROR: 'accept-invite-sheet-code-error',
  CANCEL_EDIT: 'accept-invite-sheet-cancel-edit',
  DECLINE: 'accept-invite-sheet-decline',
  ACCEPT: 'accept-invite-sheet-accept',
} as const;

/**
 * Invite copy, resolved per key.
 *
 * The server owns this screen's words: it fills every `localized_text` key
 * from its own defaults, so a missing key means there is no referral-me
 * payload at all (Money disabled, or the fetch failed). Only keys that an
 * existing Mobile string already says have a fallback — this screen adds no
 * locale keys, so the rest render as nothing and the affordance they label is
 * left out rather than shown blank.
 */
function useInviteCopy(localizedText: ReferralLocalizedText | undefined) {
  return useMemo(
    () => ({
      title: localizedText?.inviteTitle ?? '',
      body: localizedText?.inviteBody ?? '',
      codeLabel:
        localizedText?.inviteReferralCode ??
        strings('rewards.referral.referral_code'),
      codePlaceholder:
        localizedText?.inviteCodePlaceholder ??
        strings('rewards.referral.referral_code'),
      useDifferentCode: localizedText?.inviteUseDifferentCode ?? '',
      cancelEdit:
        localizedText?.inviteCancelEdit ??
        strings('rewards.optout.modal.cancel'),
      decline:
        localizedText?.inviteDecline ?? strings('rewards.vip.splash_not_now'),
      accept:
        localizedText?.inviteAccept ??
        strings('rewards.vip.referee_splash_continue'),
    }),
    [localizedText],
  );
}

interface InviteCodeFieldProps {
  referralCode: string;
  codeLabel: string;
  codePlaceholder: string;
  cancelEditLabel: string;
  useDifferentCodeLabel: string;
  isEditing: boolean;
  isEditable: boolean;
  isValidated: boolean;
  errorMessage: string;
  onBeginEditing: () => void;
  onCancelEditing: () => void;
  onChangeReferralCode: (code: string) => void;
}

/**
 * The invited code, shown as the invite's headline until the user asks to
 * replace it. Editing is offered only when there is copy that labels it.
 */
const InviteCodeField: React.FC<InviteCodeFieldProps> = ({
  referralCode,
  codeLabel,
  codePlaceholder,
  cancelEditLabel,
  useDifferentCodeLabel,
  isEditing,
  isEditable,
  isValidated,
  errorMessage,
  onBeginEditing,
  onCancelEditing,
  onChangeReferralCode,
}) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <Box
      twClassName="mt-4 justify-start"
      testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE_FIELD}
    >
      {isEditing ? (
        <>
          <Label fontWeight={FontWeight.Medium}>{codeLabel}</Label>
          <TextField
            value={referralCode}
            onChangeText={onChangeReferralCode}
            placeholder={codePlaceholder}
            isDisabled={!isEditable}
            isError={Boolean(errorMessage)}
            endAccessory={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                {isValidated && !errorMessage && (
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Md}
                    color={IconColor.SuccessDefault}
                    testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE_VALID}
                  />
                )}
                <TextButton
                  variant={TextVariant.BodyMd}
                  onPress={isEditable ? onCancelEditing : undefined}
                  accessibilityRole="button"
                  testID={ACCEPT_INVITE_SHEET_TEST_IDS.CANCEL_EDIT}
                >
                  {cancelEditLabel}
                </TextButton>
              </Box>
            }
            inputProps={{
              autoCapitalize: 'characters',
              autoCorrect: false,
              autoComplete: 'off',
              maxLength: MONEY_REFERRAL_CODE_MAX_LENGTH,
              accessibilityLabel: codeLabel,
              testID: ACCEPT_INVITE_SHEET_TEST_IDS.CODE_INPUT,
            }}
            inputRef={inputRef}
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
        </>
      ) : (
        <>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {codeLabel}
          </Text>
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            twClassName="leading-none"
            testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE}
          >
            {referralCode}
          </Text>
          {Boolean(useDifferentCodeLabel) && (
            <TextButton
              variant={TextVariant.BodySm}
              onPress={onBeginEditing}
              accessibilityRole="button"
              twClassName="self-start p-0"
              testID={ACCEPT_INVITE_SHEET_TEST_IDS.EDIT_CODE}
            >
              {useDifferentCodeLabel}
            </TextButton>
          )}
          {Boolean(errorMessage) && (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default mt-1"
              testID={ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR}
            >
              {errorMessage}
            </Text>
          )}
        </>
      )}
    </Box>
  );
};

export interface AcceptInviteSheetProps {
  route: {
    params?: RewardsMoneyInviteSheetParams;
  };
}

/**
 * Root modal for accepting a Money referral invite.
 *
 * Opened for `variant: NONE` callers, which is why it reads referral me from
 * the profile-keyed slice Rewards Home already filled rather than fetching it
 * again. Registration belongs to `useAcceptMoneyReferralCode`: it keeps the
 * sheet open on a refusal and dismisses it itself once the role has been read
 * back, so this screen never navigates on accept.
 */
const AcceptInviteSheet: React.FC<AcceptInviteSheetProps> = ({ route }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const initialReferralCode = route.params?.referralCode ?? '';

  const { profileId, isResolved: isProfileResolved } = useSessionProfileId();
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
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

  // The copy is read under a profile id that resolves asynchronously, so an
  // absent invite string is only final once the session and the entry have
  // both settled. Anything decided before that is deciding on a blank payload.
  const isCopyPending = !isProfileResolved || Boolean(referralMeEntry?.loading);

  const inviteHero = referralMe?.invite_hero;

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
    clearError,
  } = useAcceptMoneyReferralCode();

  const canRequestEdit = Boolean(copy.useDifferentCode);
  const [isEditRequested, setIsEditRequested] = useState(false);
  // Derived rather than initialized, so a code that arrived on the route is
  // shown as the invite's headline from the first frame and stays there once
  // the copy that labels the edit affordance lands. With no such copy the
  // field itself is the only way to fix a code, so it opens editable — but
  // only once the absence is settled, never on a payload still in flight.
  const isEditing =
    isEditRequested || !referralCode || (!canRequestEdit && !isCopyPending);
  const codeAtEditStartRef = useRef(referralCode);

  const hasCodeToValidate =
    referralCode.length >= MONEY_REFERRAL_CODE_MIN_LENGTH;
  // A code the server rejected, as opposed to validation that could not run.
  const isRejectedCode =
    hasCodeToValidate && !isValidating && !isValid && !isUnknownError;
  const errorMessage =
    registerError ||
    (isRejectedCode
      ? strings('rewards.error_messages.invalid_referral_code')
      : isUnknownError
        ? strings('rewards.error_messages.something_went_wrong')
        : '');

  // A code that could not be validated is still offered to the server, which
  // is the authority on it; a rejected one would only be refused again.
  const canAccept =
    hasCodeToValidate && !isValidating && !isRejectedCode && !isAccepting;

  const handleChangeReferralCode = useCallback(
    (code: string) => {
      clearError();
      setReferralCode(code);
    },
    [clearError, setReferralCode],
  );

  const handleBeginEditing = useCallback(() => {
    codeAtEditStartRef.current = referralCode;
    setIsEditRequested(true);
  }, [referralCode]);

  const handleCancelEditing = useCallback(() => {
    setReferralCode(codeAtEditStartRef.current);
    // Withdrawing the request is all this does: whether the field closes is
    // the same derivation as on first render.
    setIsEditRequested(false);
  }, [setReferralCode]);

  const handleDecline = useCallback(() => {
    // Dismissing mid-registration would leave the write unattended, and it is
    // about to dismiss the sheet itself.
    if (isAccepting) {
      return;
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [isAccepting]);

  const handleAccept = useCallback(() => {
    if (!canAccept) {
      return;
    }
    // Accept is about to refresh me to a non-NONE variant. Record that this
    // sheet was the invite, so that write cannot be read as a stale deeplink.
    hasSeenEligibleInviteRef.current = true;
    // The hook owns the outcome: it reports a refusal and dismisses the sheet
    // only once the registration has landed.
    acceptReferralCode(referralCode).catch(() => undefined);
  }, [acceptReferralCode, canAccept, referralCode]);

  useEffect(() => {
    if (shouldDismissForReferralVariant) {
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
      goBack={navigation.goBack}
      testID={ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleDecline}
        closeButtonProps={{ testID: ACCEPT_INVITE_SHEET_TEST_IDS.CLOSE }}
      >
        {copy.title}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        {inviteHero ? (
          <Box
            alignItems={BoxAlignItems.Center}
            testID={ACCEPT_INVITE_SHEET_TEST_IDS.HERO}
          >
            <RewardsThemeImageComponent
              themeImage={inviteHero}
              style={tw.style('h-28 w-48')}
            />
          </Box>
        ) : null}
        {Boolean(copy.body) && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
            testID={ACCEPT_INVITE_SHEET_TEST_IDS.BODY}
          >
            {copy.body}
          </Text>
        )}
        <InviteCodeField
          referralCode={referralCode}
          codeLabel={copy.codeLabel}
          codePlaceholder={copy.codePlaceholder}
          cancelEditLabel={copy.cancelEdit}
          useDifferentCodeLabel={copy.useDifferentCode}
          isEditing={isEditing}
          isEditable={!isAccepting}
          isValidated={isValid}
          errorMessage={errorMessage}
          onBeginEditing={handleBeginEditing}
          onCancelEditing={handleCancelEditing}
          onChangeReferralCode={handleChangeReferralCode}
        />
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        secondaryButtonProps={{
          children: copy.decline,
          onPress: handleDecline,
          size: ButtonSize.Lg,
          isDisabled: isAccepting,
          testID: ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE,
        }}
        primaryButtonProps={{
          children: copy.accept,
          onPress: handleAccept,
          size: ButtonSize.Lg,
          isLoading: isAccepting,
          isDisabled: !canAccept,
          testID: ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT,
        }}
        twClassName="px-4 pt-6"
      />
    </BottomSheet>
  );
};

export default AcceptInviteSheet;
