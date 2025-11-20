import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { AppThemeKey, Colors } from '../../../util/theme/models';
import GoogleIcon from 'images/google.svg';
import AppleIcon from 'images/apple.svg';
import AppleWhiteIcon from 'images/apple-white.svg';
import { OnboardingSheetSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSheet.selectors';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../core/AppConstants';

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

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.muted,
    },
    bottomSheetContainer: {
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialBtn: {
      borderColor: colors.border.muted,
      borderWidth: 1,
      color: colors.background.default,
      backgroundColor: colors.text.default,
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 16,
      width: '100%',
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    termsText: {
      marginTop: 24,
      alignItems: 'center',
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    link: {
      color: colors.primary.default,
    },
    centeredText: {
      textAlign: 'center',
    },
  });

const OnboardingSheet = (props: OnboardingSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const {
    onPressCreate,
    onPressImport,
    onPressContinueWithGoogle,
    onPressContinueWithApple,
    createWallet = false,
  } = props.route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
      <View
        style={styles.bottomSheetContainer}
        testID={OnboardingSheetSelectorIDs.CONTAINER_ID}
      >
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Secondary}
            onPress={onPressContinueWithGoogleAction}
            testID={OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON}
            label={
              <View style={styles.buttonLabel}>
                <GoogleIcon
                  fill="currentColor"
                  width={24}
                  height={24}
                  name={'google'}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  style={{ color: colors.background.default }}
                >
                  {createWallet
                    ? strings('onboarding.continue_with_google')
                    : strings('onboarding.sign_in_with_google')}
                </Text>
              </View>
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.socialBtn}
          />
          <Button
            variant={ButtonVariants.Secondary}
            onPress={onPressContinueWithAppleAction}
            testID={OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON}
            label={
              <View style={styles.buttonLabel}>
                {isDark ? (
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
                )}
                <Text
                  variant={TextVariant.BodyMDMedium}
                  style={{ color: colors.background.default }}
                >
                  {createWallet
                    ? strings('onboarding.continue_with_apple')
                    : strings('onboarding.sign_in_with_apple')}
                </Text>
              </View>
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.socialBtn}
          />
        </View>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Muted}>
            {strings('onboarding.or')}
          </Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Secondary}
            onPress={createWallet ? onPressCreateAction : onPressImportAction}
            testID={OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON}
            label={
              createWallet
                ? strings('onboarding.continue_with_srp')
                : strings('onboarding.import_srp')
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
        <View style={styles.termsText}>
          <Text
            variant={TextVariant.BodyXSMedium}
            color={TextColor.Default}
            style={styles.centeredText}
          >
            {strings('onboarding.by_continuing')}{' '}
            <Text
              variant={TextVariant.BodyXSMedium}
              style={styles.link}
              onPress={onPressTermsOfUse}
              suppressHighlighting
              testID="terms-of-use-link"
            >
              {strings('onboarding.terms_of_use')}
            </Text>{' '}
            {strings('onboarding.and')}{' '}
            <Text
              variant={TextVariant.BodyXSMedium}
              style={styles.link}
              onPress={onPressPrivacyNotice}
              suppressHighlighting
              testID="privacy-notice-link"
            >
              {strings('onboarding.privacy_notice')}
            </Text>
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
};

export default OnboardingSheet;
