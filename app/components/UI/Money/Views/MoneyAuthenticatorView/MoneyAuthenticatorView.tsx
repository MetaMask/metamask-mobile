import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import ClipboardManager from '../../../../../core/ClipboardManager';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { useTheme } from '../../../../../util/theme';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ComponentIconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { completePrototypeMoneySend } from '../../utils/completePrototypeMoneySend';
import {
  MONEY_AUTHENTICATOR_SETUP_KEY,
  MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT,
} from '../../constants/moneyAuthenticator';
import { MoneyAuthenticatorViewTestIds } from './MoneyAuthenticatorView.testIds';
import MoneySecuritySetupTitle from '../../components/MoneySecuritySetupTitle';

type AuthenticatorStep = 'setup' | 'verify';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  setupKey: {
    textAlign: 'left',
    letterSpacing: 0.6,
  },
  setupKeyText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  codeInputContainer: {
    position: 'relative',
    height: 64,
    marginTop: 40,
  },
  hiddenCodeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
  },
  codeCell: {
    width: 52,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Prototype-only keypad colors have no direct design-token equivalent.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
const createKeypadStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1C1C1E' : '#DEDEDE',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    rows: { gap: 14 },
    row: { flexDirection: 'row', gap: 14 },
    key: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#252527' : '#FAFAFA',
    },
    specialKey: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const MoneyAuthenticatorView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyAuthenticator'>>();
  const insets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const keypadStyles = useMemo(
    () => createKeypadStyles(themeAppearance === 'dark'),
    [themeAppearance],
  );
  const { toastRef } = useContext(ToastContext);
  const { deletePasskey, markTaskComplete, passkeyCount, removeEmail } =
    useMoneyFinishSetup();
  const {
    addAuthenticator,
    isSocialLogin,
    removeSms,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);
  const codeInputRef = useRef<TextInput>(null);
  const [step, setStep] = useState<AuthenticatorStep>(
    route.params.initialStep ?? 'setup',
  );
  const isTransactionVerification =
    route.params.verificationAction?.type === 'verify-transaction';
  const isAdditionalFactorPrompt =
    route.params.entryPoint === 'additional_factor';
  const isProtectMoneySetup = route.params.entryPoint === 'protect_money';
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setIsCodeInvalid(false);
  }, []);

  const focusCodeInput = useCallback(() => {
    codeInputRef.current?.focus();
  }, []);

  const showSuccessToast = useCallback(
    (label: string, variant: 'success' | 'error' = 'success') => {
      const isError = variant === 'error';
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: isError ? ComponentIconName.Danger : ComponentIconName.Check,
        iconColor: isError ? colors.error.default : colors.success.default,
        hasNoTimeout: false,
        labelOptions: [
          {
            label,
            isBold: true,
          },
        ],
      });
    },
    [colors.error.default, colors.success.default, toastRef],
  );

  const navigateToMoneyHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleNotNow = useCallback(() => {
    navigateToMoneyHome();
  }, [navigateToMoneyHome]);

  const handleBack = useCallback(() => {
    if (step === 'verify') {
      if (route.params.verificationAction) {
        if (route.params.verificationAction.type === 'verify-transaction') {
          if (route.params.fallbackToMethodChooser) {
            navigation.goBack();
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
              params: {
                action: route.params.verificationAction,
                showMethodChooser: true,
              },
            });
            return;
          }
          showSuccessToast(
            strings('money.security.transaction_verification_required'),
            'error',
          );
          navigation.goBack();
          return;
        }
        if (
          route.params.verificationAction.type ===
            'enable-transaction-verification' ||
          (route.params.verificationAction.type ===
            'disable-transaction-verification' &&
            route.params.verificationAction.returnToMoneyHome)
        ) {
          navigateToMoneyHome();
          return;
        }
        navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
        return;
      }
      setStep('setup');
      setIsCodeInvalid(false);
      return;
    }
    if (isAdditionalFactorPrompt || isProtectMoneySetup) {
      navigateToMoneyHome();
      return;
    }
    navigation.goBack();
  }, [
    isAdditionalFactorPrompt,
    isProtectMoneySetup,
    navigation,
    navigateToMoneyHome,
    route.params.fallbackToMethodChooser,
    route.params.verificationAction,
    showSuccessToast,
    step,
  ]);

  const handleCopyKey = useCallback(async () => {
    await ClipboardManager.setString(MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT);
    setIsCopied(true);
  }, []);

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }

    const timer = setTimeout(() => setIsCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleContinue = useCallback(() => {
    setStep('verify');
    setCode('');
    setIsCodeInvalid(false);
  }, []);

  const handleDigitPress = useCallback((digit: string) => {
    setCode((currentCode) =>
      currentCode.length >= 6 ? currentCode : `${currentCode}${digit}`,
    );
    setIsCodeInvalid(false);
  }, []);

  const handleDelete = useCallback(() => {
    setCode((currentCode) => currentCode.slice(0, -1));
    setIsCodeInvalid(false);
  }, []);

  const handleVerify = useCallback(() => {
    const { verificationAction } = route.params;
    if (verificationAction) {
      switch (verificationAction.type) {
        case 'disable-transaction-verification':
          setTransactionVerificationEnabled(false);
          if (verificationAction.returnToPrevious) {
            navigation.goBack();
            setTimeout(
              () =>
                showSuccessToast(
                  strings('money.security.disabled_success_toast'),
                ),
              300,
            );
          } else if (verificationAction.returnToMoneyHome) {
            navigation.navigate(Routes.HOME_TABS, {
              screen: Routes.MONEY.ROOT,
              params: { screen: Routes.MONEY.HOME },
            });
            setTimeout(
              () =>
                showSuccessToast(
                  strings('money.security.disabled_success_toast'),
                ),
              300,
            );
          } else {
            navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
          }
          return;
        case 'enable-transaction-verification':
          setTransactionVerificationEnabled(true);
          if (verificationAction.returnToPrevious) {
            navigation.goBack();
          } else {
            navigation.navigate(Routes.HOME_TABS, {
              screen: Routes.MONEY.ROOT,
              params: { screen: Routes.MONEY.HOME },
            });
          }
          setTimeout(
            () =>
              showSuccessToast(strings('money.security.enabled_success_toast')),
            300,
          );
          return;
        case 'delete-passkey':
          deletePasskey(verificationAction.passkeyIndex);
          navigation.navigate(Routes.MONEY.PASSKEYS, {
            entryPoint: 'security',
          });
          showSuccessToast(strings('money.passkey_details.removed_toast'));
          return;
        case 'remove-email':
          removeEmail();
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.email_details.removed_toast'),
          });
          return;
        case 'remove-sms':
          removeSms();
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.sms_details.removed_toast'),
          });
          return;
        case 'remove-authenticator':
          return;
        case 'verify-transaction':
          completePrototypeMoneySend(navigation, showSuccessToast);
          return;
      }
    }

    addAuthenticator();
    const successToast = strings('money.authenticator.success_toast');

    if (route.params.entryPoint === 'finish_setup') {
      if (!isSocialLogin) {
        markTaskComplete('secure_money');
        setTransactionVerificationEnabled(true);
        navigation.navigate(Routes.MONEY.SMS_SETUP, {
          additionalFactorPrompt: true,
        });
        setTimeout(() => showSuccessToast(successToast), 300);
        return;
      }

      markTaskComplete('recovery_method');
      navigateToMoneyHome();
      setTimeout(() => showSuccessToast(successToast), 300);
    } else if (isAdditionalFactorPrompt || isProtectMoneySetup) {
      navigateToMoneyHome();
      setTimeout(() => showSuccessToast(successToast), 300);
    } else {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, { successToast });
    }
  }, [
    addAuthenticator,
    deletePasskey,
    isAdditionalFactorPrompt,
    isProtectMoneySetup,
    isSocialLogin,
    markTaskComplete,
    navigation,
    navigateToMoneyHome,
    route.params,
    removeSms,
    removeEmail,
    setTransactionVerificationEnabled,
    showSuccessToast,
  ]);

  const handleAlternativeMethod = useCallback(() => {
    navigation.navigate(Routes.MONEY.SMS_SETUP, {
      ...(isAdditionalFactorPrompt
        ? { additionalFactorPrompt: true }
        : { returnToMoneyHome: true }),
    });
  }, [isAdditionalFactorPrompt, navigation]);

  const handleSetUpWithQrCode = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.AUTHENTICATOR_KEY_SHEET,
      params: { entryPoint: route.params.entryPoint },
    });
  }, [navigation, route.params.entryPoint]);

  useEffect(() => {
    if (step !== 'verify' || code.length !== 6) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (code === '000000') {
        setCode('');
        setIsCodeInvalid(true);
        focusCodeInput();
        return;
      }
      handleVerify();
    }, 250);
    return () => clearTimeout(timer);
  }, [code, focusCodeInput, handleVerify, step]);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyAuthenticatorViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        {isTransactionVerification && route.params.showCloseButton ? (
          <Box style={styles.headerSpacer} />
        ) : (
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={MoneyAuthenticatorViewTestIds.BACK_BUTTON}
          />
        )}
        {isTransactionVerification && route.params.showCloseButton ? (
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.close')}
            testID={MoneyAuthenticatorViewTestIds.BACK_BUTTON}
          />
        ) : step === 'setup' ? (
          <ButtonIcon
            iconName={IconName.QrCode}
            size={ButtonIconSize.Md}
            onPress={handleSetUpWithQrCode}
            accessibilityLabel={strings('money.authenticator.setup_with_qr')}
            testID={MoneyAuthenticatorViewTestIds.QR_SETUP_BUTTON}
          />
        ) : (
          <Box style={styles.headerSpacer} />
        )}
      </Box>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'setup' ? (
            <>
              <MoneySecuritySetupTitle>
                {strings(
                  isAdditionalFactorPrompt
                    ? 'money.authenticator.additional_factor_title'
                    : 'money.authenticator.setup_title',
                )}
              </MoneySecuritySetupTitle>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
                color={TextColor.TextAlternative}
                twClassName="mt-2"
              >
                {strings(
                  isAdditionalFactorPrompt
                    ? 'money.authenticator.additional_factor_description'
                    : 'money.authenticator.instruction_combined',
                )}
              </Text>

              {isAdditionalFactorPrompt && (
                <>
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Bold}
                    twClassName="mt-6"
                  >
                    {strings(
                      'money.authenticator.additional_factor_setup_title',
                    )}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="mt-2"
                  >
                    {strings('money.authenticator.instruction_combined')}
                  </Text>
                </>
              )}

              <Pressable
                onPress={handleCopyKey}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'money.authenticator.copy_key_link',
                )}
                testID={MoneyAuthenticatorViewTestIds.COPY_BUTTON}
              >
                <Box
                  twClassName={
                    isAdditionalFactorPrompt
                      ? 'mt-4 rounded-xl bg-muted p-4'
                      : 'mt-6 rounded-xl bg-muted p-4'
                  }
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Box style={styles.setupKeyText}>
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('money.authenticator.setup_key')}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      style={styles.setupKey}
                      twClassName="mt-1"
                    >
                      {MONEY_AUTHENTICATOR_SETUP_KEY}
                    </Text>
                  </Box>
                  <Icon
                    name={isCopied ? IconName.CopySuccess : IconName.Copy}
                    size={IconSize.Lg}
                    color={
                      isCopied
                        ? IconColor.SuccessDefault
                        : IconColor.IconDefault
                    }
                  />
                </Box>
              </Pressable>
            </>
          ) : (
            <>
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
              >
                {strings('money.email_code_verification.title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-2"
              >
                {strings('money.authenticator.verify_description')}
              </Text>

              <Pressable
                style={styles.codeInputContainer}
                onPress={focusCodeInput}
                accessibilityRole="button"
                testID={MoneyAuthenticatorViewTestIds.CODE_ENTRY}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Between}
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <Box
                      key={index}
                      style={styles.codeCell}
                      twClassName="bg-muted border border-muted"
                    >
                      <Text
                        variant={TextVariant.HeadingMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {code[index] ?? ''}
                      </Text>
                    </Box>
                  ))}
                </Box>
                <TextInput
                  ref={codeInputRef}
                  style={styles.hiddenCodeInput}
                  value={code}
                  onChangeText={handleCodeChange}
                  onLayout={focusCodeInput}
                  keyboardType="number-pad"
                  keyboardAppearance={themeAppearance}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  showSoftInputOnFocus={false}
                  maxLength={6}
                  autoFocus
                  caretHidden
                  testID={MoneyAuthenticatorViewTestIds.CODE_INPUT}
                />
              </Pressable>
              {isCodeInvalid && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="mt-2"
                >
                  {strings('money.authenticator.invalid_code')}
                </Text>
              )}
            </>
          )}
        </ScrollView>

        {step === 'verify' && (
          <Box
            style={[
              keypadStyles.container,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Box style={keypadStyles.rows}>
              {KEYPAD_ROWS.map((row) => (
                <Box key={row.join('')} style={keypadStyles.row}>
                  {row.map((digit) => (
                    <Pressable
                      key={digit}
                      style={keypadStyles.key}
                      onPress={() => handleDigitPress(digit)}
                      accessibilityRole="button"
                      accessibilityLabel={digit}
                      testID={`money-authenticator-key-${digit}`}
                    >
                      <Text
                        variant={TextVariant.HeadingLg}
                        fontWeight={FontWeight.Regular}
                      >
                        {digit}
                      </Text>
                    </Pressable>
                  ))}
                </Box>
              ))}
              <Box style={keypadStyles.row}>
                <Box style={keypadStyles.specialKey} />
                <Pressable
                  style={keypadStyles.key}
                  onPress={() => handleDigitPress('0')}
                  accessibilityRole="button"
                  accessibilityLabel="0"
                  testID="money-authenticator-key-0"
                >
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Regular}
                  >
                    0
                  </Text>
                </Pressable>
                <Pressable
                  style={keypadStyles.specialKey}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  testID="money-authenticator-key-delete"
                >
                  <Icon
                    name={IconName.Backspace}
                    size={IconSize.Xl}
                    color={IconColor.IconDefault}
                  />
                </Pressable>
              </Box>
            </Box>
          </Box>
        )}

        {step === 'setup' && (
          <Box
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleContinue}
              testID={MoneyAuthenticatorViewTestIds.CONTINUE_BUTTON}
            >
              {strings('money.authenticator.continue')}
            </Button>
            {((route.params.entryPoint === 'finish_setup' && isSocialLogin) ||
              isAdditionalFactorPrompt) && (
              <>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={handleAlternativeMethod}
                  testID={MoneyAuthenticatorViewTestIds.ALTERNATIVE_BUTTON}
                  twClassName="mt-2"
                >
                  {strings(
                    isAdditionalFactorPrompt
                      ? 'money.authenticator.add_sms_instead'
                      : 'money.authenticator.use_sms_instead',
                  )}
                </Button>
                {isAdditionalFactorPrompt && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    onPress={handleNotNow}
                    testID={MoneyAuthenticatorViewTestIds.NOT_NOW_BUTTON}
                    twClassName="mt-2"
                  >
                    {strings('money.authenticator.not_now')}
                  </Button>
                )}
              </>
            )}
          </Box>
        )}
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneyAuthenticatorView;
