import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import GoogleIcon from 'images/google.svg';
import AppleIcon from 'images/apple.svg';
import AppleWhiteIcon from 'images/apple-white.svg';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../core/AppConstants';
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface OnboardingSheetParams {
  onPressCreate?: () => void;
  onPressImport?: () => void;
  onPressContinueWithGoogle?: (createWallet: boolean) => void;
  onPressContinueWithApple?: (createWallet: boolean) => void;
  createWallet?: boolean;
}

export interface OnboardingSheetProps {
  route: {
    params: OnboardingSheetParams;
  };
}

const OnboardingSheet = (props: OnboardingSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const {
    onPressCreate,
    onPressImport,
    onPressContinueWithGoogle,
    onPressContinueWithApple,
    createWallet = false,
  } = props.route.params ?? {};
  const { colors } = useTheme();
  const tw = useTailwind();

  const onPressCreateAction = () => {
    if (onPressCreate) {
      onPressCreate();
    }
  };

  const onPressImportAction = () => {
    if (onPressImport) {
      onPressImport();
    }
  };

  const onPressContinueWithGoogleAction = () => {
    if (onPressContinueWithGoogle) {
      onPressContinueWithGoogle(createWallet);
    }
  };

  const onPressContinueWithAppleAction = () => {
    if (onPressContinueWithApple) {
      onPressContinueWithApple(createWallet);
    }
  };

  const goTo = (url: string, title: string) => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const onPressTermsOfUse = () => {
    const url = AppConstants.URLS.TERMS_OF_USE_URL;
    goTo(url, strings('onboarding.terms_of_use'));
  };

  const onPressPrivacyNotice = () => {
    const url = AppConstants.URLS.PRIVACY_NOTICE;
    goTo(url, strings('onboarding.privacy_notice'));
  };

  const { themeAppearance } = useTheme();
  const isDark = themeAppearance === AppThemeKey.dark;

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4 gap-y-4"
        testID={OnboardingSheetSelectorIDs.CONTAINER_ID}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.End}
          twClassName="gap-4 w-full"
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
            style={tw.style('border border-muted', {
              backgroundColor: colors.text.default,
            })}
            textProps={{ style: { color: colors.background.default } }}
          >
            {createWallet
              ? strings('onboarding.continue_with_apple')
              : strings('onboarding.sign_in_with_apple')}
          </Button>
        </Box>
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
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.End}
          twClassName="gap-4 w-full"
        >
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
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="mt-6">
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            style={tw.style('text-center')}
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
      </Box>
    </BottomSheet>
  );
};

export default OnboardingSheet;
