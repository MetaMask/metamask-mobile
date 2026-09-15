import React, { useCallback, useRef } from 'react';
import { strings } from '../../../../locales/i18n';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  BottomSheet,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SocialLoginProviderButtons from '../../UI/SocialLoginProviderButtons';

export interface OnboardingSheetParams {
  onPressCreate?: () => void;
  onPressImport?: () => void;
  onPressContinueWithGoogle?: (createWallet: boolean) => void;
  onPressContinueWithApple?: (createWallet: boolean) => void;
  onPressContinueWithTelegram?: (createWallet: boolean) => void;
  createWallet?: boolean;
  recoveryPrototype?: boolean;
}

type OnboardingSheetRouteProp = RouteProp<
  { OnboardingSheet: OnboardingSheetParams },
  'OnboardingSheet'
>;

const OnboardingSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<OnboardingSheetRouteProp>();
  const {
    onPressCreate,
    onPressImport,
    onPressContinueWithGoogle,
    onPressContinueWithApple,
    onPressContinueWithTelegram,
    createWallet = false,
    recoveryPrototype = false,
  } = params ?? {};
  const tw = useTailwind();
  const runPrototypeAction = (action: () => void) => {
    if (recoveryPrototype && sheetRef.current) {
      sheetRef.current.onCloseBottomSheet(action);
      return;
    }
    action();
  };
  const onPressCreateAction = () => {
    if (onPressCreate) {
      onPressCreate();
    }
  };

  const onPressImportAction = () => {
    if (onPressImport) {
      runPrototypeAction(onPressImport);
    }
  };

  const onPressContinueWithGoogleAction = () => {
    if (onPressContinueWithGoogle) {
      runPrototypeAction(() => onPressContinueWithGoogle(createWallet));
    }
  };

  const onPressContinueWithAppleAction = () => {
    if (recoveryPrototype) {
      return;
    }
    if (onPressContinueWithApple) {
      onPressContinueWithApple(createWallet);
    }
  };

  const onPressContinueWithTelegramAction = () => {
    if (recoveryPrototype) {
      return;
    }
    if (onPressContinueWithTelegram) {
      onPressContinueWithTelegram(createWallet);
    }
  };

  const goTo = useCallback(
    (url: string, title: string) => {
      navigation.navigate(Routes.WEBVIEW.SIMPLE, {
        url,
        title,
      });
    },
    [navigation],
  );

  const onPressTermsOfUse = () => {
    const url = AppConstants.URLS.TERMS_OF_USE_URL;
    goTo(url, strings('onboarding.terms_of_use'));
  };

  const onPressPrivacyNotice = () => {
    const url = AppConstants.URLS.PRIVACY_NOTICE;
    goTo(url, strings('onboarding.privacy_notice'));
  };

  return (
    <BottomSheet goBack={navigation.goBack} ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4 gap-y-4"
        testID={OnboardingSheetSelectorIDs.CONTAINER_ID}
      >
        <SocialLoginProviderButtons
          googleLabel={
            createWallet
              ? strings('onboarding.continue_with_google')
              : strings('onboarding.sign_in_with_google')
          }
          appleLabel={
            createWallet
              ? strings('onboarding.continue_with_apple')
              : strings('onboarding.sign_in_with_apple')
          }
          telegramLabel={
            createWallet
              ? strings('onboarding.continue_with_telegram')
              : strings('onboarding.sign_in_with_telegram')
          }
          onPressGoogle={onPressContinueWithGoogleAction}
          onPressApple={onPressContinueWithAppleAction}
          onPressTelegram={
            onPressContinueWithTelegram
              ? onPressContinueWithTelegramAction
              : undefined
          }
          googleTestID={OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON}
          appleTestID={OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON}
          telegramTestID={OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-2.5"
        >
          <Box twClassName="flex-1 h-px bg-border-muted" />
          <Text
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextMuted}
            style={tw.style({ fontSize: 20 })}
          >
            {strings('onboarding.or')}
          </Text>
          <Box twClassName="flex-1 h-px bg-border-muted" />
        </Box>
        <Button
          variant={ButtonVariant.Secondary}
          onPress={createWallet ? onPressCreateAction : onPressImportAction}
          testID={OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON}
          isFullWidth
          size={ButtonSize.Lg}
        >
          {createWallet
            ? strings('onboarding.continue_with_srp')
            : strings('onboarding.import_srp')}
        </Button>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-6 text-center"
        >
          {strings('onboarding.by_continuing')}{' '}
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            onPress={onPressTermsOfUse}
            testID="terms-of-use-link"
          >
            {strings('onboarding.terms_of_use')}
          </Text>{' '}
          {strings('onboarding.and')}{' '}
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            onPress={onPressPrivacyNotice}
            testID="privacy-notice-link"
          >
            {strings('onboarding.privacy_notice')}
          </Text>
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default OnboardingSheet;
