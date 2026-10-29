import React, { useCallback, useRef } from 'react';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';

import GoogleIcon from 'images/google.svg';
import AppleIcon from 'images/apple.svg';
import AppleWhiteIcon from 'images/apple-white.svg';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { AuthConnection } from '../../../../core/OAuthService/OAuthInterface';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import { colors as commonColors } from '../../../../styles/common';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  BottomSheet,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ButtonGlass from '../../../../component-library/components-temp/ButtonGlass';
import { OnboardingScreenIds } from '../../../../hooks/performance/onboardingPerformanceIds';
import { useNavigationPerformance } from '../../../../hooks/performance/useNavigationPerformance';
import { useScreenPerformance } from '../../../../hooks/performance/useScreenPerformance';

export interface OnboardingSheetProps {
  onDismiss: () => void;
  onPressCreate?: () => void;
  onPressImport?: () => void;
  onPressContinueWithGoogle?: (createWallet: boolean) => void | Promise<void>;
  onPressContinueWithApple?: (createWallet: boolean) => void | Promise<void>;
  onPressContinueWithTelegram?: (createWallet: boolean) => void | Promise<void>;
  createWallet?: boolean;
  loadingProvider?: AuthConnection | null;
}

/**
 * Joins a label with non-breaking spaces so an inline link wraps to the next
 * line as a whole instead of splitting across lines mid-phrase.
 */
const noWrap = (label: string) => label.replace(/ /gu, '\u00A0');

const OnboardingSheet = ({
  onDismiss,
  onPressCreate,
  onPressImport,
  onPressContinueWithGoogle,
  onPressContinueWithApple,
  onPressContinueWithTelegram,
  createWallet = false,
  loadingProvider = null,
}: OnboardingSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const isSocialLoading = loadingProvider !== null;
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();

  // Sheet CTAs are the first paint destination after Create/Import wallet.
  useScreenPerformance({
    screenId: OnboardingScreenIds.ONBOARDING_SHEET,
    contentReady: true,
    isEmpty: false,
  });
  useNavigationPerformance({
    destinationScreenId: OnboardingScreenIds.ONBOARDING_SHEET,
    destinationReady: true,
  });

  const onPressCreateAction = () => onPressCreate?.();

  const onPressImportAction = () => onPressImport?.();

  const onPressContinueWithGoogleAction = () =>
    onPressContinueWithGoogle?.(createWallet);

  const onPressContinueWithAppleAction = () =>
    onPressContinueWithApple?.(createWallet);

  const onPressContinueWithTelegramAction = () =>
    onPressContinueWithTelegram?.(createWallet);

  const goTo = useCallback(
    (url: string, title: string) => {
      navigation.navigate(Routes.WEBVIEW.SIMPLE, {
        url,
        title,
        hideShareButton: true,
        useGlassHeader: true,
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

  const isDark = themeAppearance === AppThemeKey.dark;
  const socialButtonSpinnerProps = {
    color: IconColor.IconInverse,
  };

  return (
    <BottomSheet goBack={onDismiss} ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4 gap-y-4"
        testID={OnboardingSheetSelectorIDs.CONTAINER_ID}
      >
        <Button
          variant={ButtonVariant.Secondary}
          onPress={onPressContinueWithGoogleAction}
          testID={OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON}
          startAccessory={
            <GoogleIcon
              fill="currentColor"
              width={24}
              height={24}
              name={'google'}
            />
          }
          isFullWidth
          size={ButtonSize.Lg}
          isLoading={loadingProvider === AuthConnection.Google}
          spinnerProps={socialButtonSpinnerProps}
          isDisabled={
            isSocialLoading && loadingProvider !== AuthConnection.Google
          }
          contentWrapperProps={{ twClassName: 'gap-3' }}
          style={tw.style('border border-muted', {
            backgroundColor: colors.text.default,
          })}
          textProps={{ style: { color: colors.background.default } }}
        >
          {createWallet
            ? strings('onboarding.continue_with_google')
            : strings('onboarding.sign_in_with_google')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          onPress={onPressContinueWithAppleAction}
          testID={OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON}
          startAccessory={
            isDark ? (
              <AppleIcon
                fill="currentColor"
                width={24}
                height={24}
                name={'apple'}
              />
            ) : (
              <AppleWhiteIcon
                fill="currentColor"
                width={24}
                height={24}
                name={'apple-white'}
              />
            )
          }
          isFullWidth
          size={ButtonSize.Lg}
          isLoading={loadingProvider === AuthConnection.Apple}
          spinnerProps={socialButtonSpinnerProps}
          isDisabled={
            isSocialLoading && loadingProvider !== AuthConnection.Apple
          }
          contentWrapperProps={{ twClassName: 'gap-3' }}
          style={tw.style('border border-muted', {
            backgroundColor: colors.text.default,
          })}
          textProps={{ style: { color: colors.background.default } }}
        >
          {createWallet
            ? strings('onboarding.continue_with_apple')
            : strings('onboarding.sign_in_with_apple')}
        </Button>
        {onPressContinueWithTelegram ? (
          <Button
            variant={ButtonVariant.Secondary}
            onPress={onPressContinueWithTelegramAction}
            testID={OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON}
            startAccessory={
              <Icon
                name={IconName.Telegram}
                size={IconSize.Lg}
                style={tw.style({ color: commonColors.telegramBlue })}
              />
            }
            isFullWidth
            size={ButtonSize.Lg}
            isLoading={loadingProvider === AuthConnection.Telegram}
            spinnerProps={socialButtonSpinnerProps}
            isDisabled={
              isSocialLoading && loadingProvider !== AuthConnection.Telegram
            }
            contentWrapperProps={{ twClassName: 'gap-3' }}
            style={tw.style('border border-muted', {
              backgroundColor: colors.text.default,
            })}
            textProps={{ style: { color: colors.background.default } }}
          >
            {createWallet
              ? strings('onboarding.continue_with_telegram')
              : strings('onboarding.sign_in_with_telegram')}
          </Button>
        ) : null}
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
        <ButtonGlass
          isGlass={false}
          variant={ButtonVariant.Secondary}
          onPress={createWallet ? onPressCreateAction : onPressImportAction}
          testID={OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON}
          isFullWidth
          size={ButtonSize.Lg}
          containerStyle={tw.style('self-stretch')}
          isDisabled={isSocialLoading}
        >
          {createWallet
            ? strings('onboarding.continue_with_srp')
            : strings('onboarding.import_srp')}
        </ButtonGlass>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="mt-6 text-center"
        >
          {strings('onboarding.by_continuing')}{' '}
          <TextButton
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            onPress={onPressTermsOfUse}
            testID="terms-of-use-link"
          >
            {noWrap(strings('onboarding.terms_of_use'))}
          </TextButton>{' '}
          {strings('onboarding.and')}{' '}
          <TextButton
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            onPress={onPressPrivacyNotice}
            testID="privacy-notice-link"
          >
            {noWrap(strings('onboarding.privacy_notice'))}
          </TextButton>
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default OnboardingSheet;
