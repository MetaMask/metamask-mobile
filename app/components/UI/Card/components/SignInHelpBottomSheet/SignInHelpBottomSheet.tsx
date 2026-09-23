import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  BottomSheet,
  BottomSheetHeader,
  Icon,
  IconName,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

export const createSignInHelpNavigationDetails = createNavigationDetails(
  Routes.CARD.MODALS.ID,
  Routes.CARD.MODALS.SIGN_IN_HELP,
);

const SignInHelpBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      keyboardAvoidingViewEnabled={false}
      testID="card-sign-in-help-sheet"
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('card.card_authentication.sign_in_help_title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-8 gap-5">
        <Box twClassName="flex-row gap-3">
          <Icon name={IconName.Mail} size={IconSize.Md} />
          <Box twClassName="flex-1 gap-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('card.card_authentication.sign_in_help_email_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings('card.card_authentication.sign_in_help_email_body')}
            </Text>
          </Box>
        </Box>

        <Box twClassName="flex-row gap-3">
          <Icon name={IconName.Wallet} size={IconSize.Md} />
          <Box twClassName="flex-1 gap-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('card.card_authentication.sign_in_help_wallet_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings('card.card_authentication.sign_in_help_wallet_body')}
            </Text>
          </Box>
        </Box>

        <Text variant={TextVariant.BodySm} twClassName="text-text-alternative">
          {strings('card.card_authentication.sign_in_help_footer')}
        </Text>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleClose}
        >
          {strings('card.card_authentication.sign_in_help_got_it')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default SignInHelpBottomSheet;
