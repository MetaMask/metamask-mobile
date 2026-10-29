import React, { useCallback, useRef } from 'react';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { RewardsMoneyInviteSheetParams } from '../../types/navigation';
import { selectSessionProfileId } from '../../../../../selectors/identity';
import { useMoneyReferralInvite } from '../../hooks/useMoneyReferralInvite';
import MoneyReferralCodeField from './MoneyReferralCodeField';

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

const CODE_FIELD_TEST_IDS = {
  field: ACCEPT_INVITE_SHEET_TEST_IDS.CODE_FIELD,
  input: ACCEPT_INVITE_SHEET_TEST_IDS.CODE_INPUT,
  error: ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR,
};

export interface AcceptInviteSheetProps {
  route: {
    params?: RewardsMoneyInviteSheetParams;
  };
}

/**
 * Root modal for accepting a Money referral invite.
 *
 * Opened for a plain user or a cashback-experiment member. The invite's
 * state and answers live in `useMoneyReferralInvite`; a successful
 * registration dismisses this sheet and opens the accepted splash.
 *
 * Header close / swipe / overlay dismiss without declining; the Decline CTA
 * is the explicit declined path. While a registration is in flight the sheet
 * is not interactable, so overlay, swipe, and hardware back cannot unmount it
 * before the accepted splash opens.
 */
const AcceptInviteSheet: React.FC<AcceptInviteSheetProps> = ({ route }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const profileId = useSelector(selectSessionProfileId);

  const handleAutoDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const {
    copy,
    shouldAutoDismiss,
    referralCode,
    onChangeReferralCode,
    errorMessage,
    canAccept,
    isAccepting,
    accept,
    respond,
  } = useMoneyReferralInvite({
    initialReferralCode: route.params?.referralCode ?? '',
    profileId,
    location: 'invite_sheet',
    onAutoDismiss: handleAutoDismiss,
  });

  // Only this button refuses the invite. Every other way out of the sheet
  // leaves the offer standing, so it reports `dismissed` instead.
  const handleDecline = useCallback(() => {
    if (respond('declined')) {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [respond]);

  const handleClose = useCallback(() => {
    if (respond('dismissed')) {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [respond]);

  // Reached by a swipe, the overlay and hardware back, and also by the sheet
  // finishing a close this screen asked for — which the one-answer guard in
  // the invite hook is what keeps from overwriting that answer.
  const handleGoBack = useCallback(() => {
    if (respond('dismissed')) {
      navigation.goBack();
    }
  }, [navigation, respond]);

  // `roles` decides whether this profile may still accept an invite. Do not
  // flash an unusable invite while closing a stale deeplink for an existing
  // referrer or referee, or a geo-blocked country.
  if (shouldAutoDismiss) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      isInteractable={!isAccepting}
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
        <MoneyReferralCodeField
          label={copy.codeLabel}
          value={referralCode}
          onChangeText={onChangeReferralCode}
          errorMessage={errorMessage}
          isDisabled={isAccepting}
          testIds={CODE_FIELD_TEST_IDS}
          twClassName="mt-4 mb-6"
        />
      </Box>
      <Box twClassName="gap-3 px-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting}
          isDisabled={!canAccept}
          onPress={accept}
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
