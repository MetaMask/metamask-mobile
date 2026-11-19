import React, { useContext, type ReactNode, type RefObject } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonSize,
  TextField,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  TitleStandard,
  HelpText,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import { strings } from '../../../../locales/i18n';
import {
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import { ThemeContext } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import OnboardingFoxLoader, {
  type OnboardingFoxLoaderRef,
} from '../../UI/OnboardingFoxLoader/OnboardingFoxLoader';
import { OnboardingScreenIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useNavigationPerformance } from '../../../hooks/performance/useNavigationPerformance';
import { useScreenPerformance } from '../../../hooks/performance/useScreenPerformance';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  getCreatePasswordDisabledHint,
  type PasswordFields,
} from './hooks/usePasswordFields';

const reservedHelpTextProps = (isHidden: boolean) => ({
  accessibilityElementsHidden: isHidden,
  importantForAccessibility: isHidden
    ? ('no-hide-descendants' as const)
    : ('auto' as const),
  ...(isHidden ? { style: { opacity: 0 } } : {}),
});

interface ChoosePasswordFormProps {
  description: string;
  fields: PasswordFields;
  onSubmit: () => void | Promise<void>;
  /** Submit CTA spinner; also the only async dependency of the form. */
  isSubmitLoading: boolean;
  /** Replaces the form with the fox loader. */
  isLoading: boolean;
  foxLoaderRef: RefObject<OnboardingFoxLoaderRef | null>;
  /** Rendered above the submit CTA. */
  children?: ReactNode;
  /** Rendered after the scroll view, e.g. bottom sheets. */
  overlay?: ReactNode;
}

const ChoosePasswordForm = ({
  description,
  fields,
  onSubmit,
  isSubmitLoading,
  isLoading,
  foxLoaderRef,
  children,
  overlay,
}: ChoosePasswordFormProps) => {
  const { themeAppearance } = useContext(ThemeContext);
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );

  useScreenPerformance({
    screenId: OnboardingScreenIds.CHOOSE_PASSWORD,
    contentReady: true,
    isEmpty: false,
    isLoading: isSubmitLoading,
    fullyDisplayed: !isSubmitLoading,
  });

  useNavigationPerformance({
    destinationScreenId: OnboardingScreenIds.CHOOSE_PASSWORD,
    destinationReady: true,
  });

  const {
    password,
    confirmPassword,
    hasLeftPasswordField,
    showPasswordIndex,
    confirmPasswordInputRef,
    confirmPasswordStatusMessage,
    onPasswordChange,
    setConfirmPasswordValue,
    toggleShowPassword,
    leavePasswordField,
    jumpToConfirmPassword,
    leaveConfirmPasswordField,
    submitConfirmPassword,
  } = fields;

  const renderContent = () => {
    if (isLoading) {
      return <OnboardingFoxLoader ref={foxLoaderRef} />;
    }

    const passwordMeetsLength = passwordRequirementsMet(password);
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmitPassword = passwordMeetsLength && passwordsMatch;
    const showPasswordError = hasLeftPasswordField && !passwordMeetsLength;

    return (
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-background-default')}
      >
        <HeaderStandardGlass
          backdrop="static"
          onLayout={onHeaderLayout}
          includesTopInset
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: ChoosePasswordSelectorsIDs.BACK_BUTTON_ID,
          }}
        />
        <KeyboardAwareScrollView
          style={{ marginTop: headerInset }}
          contentContainerStyle={tw.style('flex-1 px-4')}
          keyboardShouldPersistTaps="handled"
          // Pre-1.21 reflow behavior so the mt-auto CTA lifts with the keyboard
          mode="layout"
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="flex-1 pt-3"
            gap={4}
            testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
          >
            <TitleStandard
              title={strings('choose_password.title')}
              titleProps={{
                testID: ChoosePasswordSelectorsIDs.TITLE_ID,
              }}
              bottomLabel={description}
              bottomLabelProps={{
                testID: ChoosePasswordSelectorsIDs.DESCRIPTION_ID,
              }}
            />

            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="relative"
              gap={2}
            >
              <TextField
                autoFocus
                value={password}
                onChangeText={onPasswordChange}
                onBlur={leavePasswordField}
                placeholder={strings(
                  'choose_password.new_password_placeholder',
                )}
                isError={showPasswordError}
                endAccessory={
                  <ButtonIcon
                    testID={
                      ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID
                    }
                    iconName={
                      showPasswordIndex.includes(0)
                        ? IconName.Eye
                        : IconName.EyeSlash
                    }
                    size={ButtonIconSize.Md}
                    twClassName="-mr-1"
                    onPress={() => toggleShowPassword(0)}
                    accessibilityLabel={strings(
                      showPasswordIndex.includes(0)
                        ? 'choose_password.show'
                        : 'choose_password.hide',
                    )}
                  />
                }
                inputProps={{
                  secureTextEntry: showPasswordIndex.includes(0),
                  testID: ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                  accessibilityLabel:
                    ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                  onSubmitEditing: jumpToConfirmPassword,
                  autoComplete: 'password-new',
                  returnKeyType: 'next',
                  autoCapitalize: 'none',
                  keyboardAppearance: themeAppearance,
                }}
              />
              <HelpText
                severity={
                  showPasswordError ? HelpTextSeverity.Danger : undefined
                }
                {...reservedHelpTextProps(passwordMeetsLength)}
              >
                {strings('choose_password.must_be_at_least', {
                  number: MIN_PASSWORD_LENGTH,
                })}
              </HelpText>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="relative"
              gap={2}
            >
              <TextField
                inputRef={confirmPasswordInputRef}
                value={confirmPassword}
                onChangeText={setConfirmPasswordValue}
                onBlur={leaveConfirmPasswordField}
                placeholder={strings(
                  'choose_password.confirm_password_placeholder',
                )}
                endAccessory={
                  <ButtonIcon
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID
                    }
                    iconName={
                      showPasswordIndex.includes(1)
                        ? IconName.Eye
                        : IconName.EyeSlash
                    }
                    size={ButtonIconSize.Md}
                    twClassName="-mr-1"
                    isDisabled={password === ''}
                    onPress={() => toggleShowPassword(1)}
                    accessibilityLabel={strings(
                      showPasswordIndex.includes(1)
                        ? 'choose_password.show'
                        : 'choose_password.hide',
                    )}
                  />
                }
                isDisabled={password === ''}
                isError={Boolean(confirmPasswordStatusMessage)}
                inputProps={{
                  secureTextEntry: showPasswordIndex.includes(1),
                  testID: ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                  accessibilityLabel:
                    ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                  autoComplete: 'password-new',
                  onSubmitEditing: submitConfirmPassword,
                  returnKeyType: 'done',
                  autoCapitalize: 'none',
                  keyboardAppearance: themeAppearance,
                }}
              />
              {confirmPasswordStatusMessage ? (
                <HelpText
                  severity={HelpTextSeverity.Danger}
                  accessibilityLiveRegion={
                    Platform.OS === 'android' ? 'polite' : undefined
                  }
                >
                  {confirmPasswordStatusMessage}
                </HelpText>
              ) : null}
            </Box>

            {children}

            <FooterGlass
              twClassName="px-0 w-full mt-auto py-2"
              primaryButtonProps={{
                children: strings('choose_password.create_password_cta'),
                onPress: onSubmit,
                isDisabled: !canSubmitPassword,
                isLoading: isSubmitLoading,
                size: ButtonSize.Lg,
                testID: ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
                accessibilityHint: canSubmitPassword
                  ? undefined
                  : getCreatePasswordDisabledHint(password, confirmPassword),
              }}
            />
          </Box>
        </KeyboardAwareScrollView>
        {overlay}
      </SafeAreaView>
    );
  };

  // Stays mounted for the whole screen, including the wallet-creation loader.
  return (
    <>
      {renderContent()}
      <ScreenshotDeterrent enabled hasNavigation={false} isSRP={false} />
    </>
  );
};

export default ChoosePasswordForm;
