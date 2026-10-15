import React, {
  useCallback,
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
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  formatMoneySmsPhoneNumber,
  getMoneySmsLocalDigits,
  maskMoneySmsPhoneNumber,
} from '../../constants/moneySms';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { useMoneySecurityToast } from '../../hooks/useMoneySecurityToast';
import { completePrototypeMoneySend } from '../../utils/completePrototypeMoneySend';
import { MoneySmsSetupViewTestIds } from './MoneySmsSetupView.testIds';
import MoneySecuritySetupTitle from '../../components/MoneySecuritySetupTitle';

type SmsSetupStep = 'phone' | 'verify';
const RESEND_DELAY_SECONDS = 30;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  headerSpacer: { width: 40 },
  verifyHeader: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  codeInputContainer: {
    position: 'relative',
    height: 64,
    marginTop: 8,
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
    flex: 1,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  verifyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  pasteButton: {
    alignSelf: 'flex-end',
    marginRight: -4,
    paddingVertical: 4,
  },
});

// Prototype-only native iOS keypad colors have no equivalent design token.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
const createKeypadStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1C1C1E' : '#DEDEDE',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 9,
      paddingTop: 8,
    },
    rows: { gap: 7 },
    row: { flexDirection: 'row', gap: 7 },
    key: {
      flex: 1,
      height: 56,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#575759' : '#FAFAFA',
    },
    specialKey: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyNumber: { lineHeight: 27 },
    keyLetters: {
      letterSpacing: 2,
      lineHeight: 12,
    },
  });
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

const KEYPAD_ROWS = [
  [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
  ],
  [
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
  ],
  [
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
  ],
] as const;

const MoneySmsSetupView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneySmsSetup'>>();
  const insets = useSafeAreaInsets();
  const { themeAppearance } = useTheme();
  const keypadStyles = useMemo(
    () => createKeypadStyles(themeAppearance === 'dark'),
    [themeAppearance],
  );
  const { deletePasskey, markTaskComplete, removeEmail } =
    useMoneyFinishSetup();
  const {
    addSms,
    removeAuthenticator,
    removeSms,
    setTransactionVerificationEnabled,
    smsPhoneNumber,
  } = useMoneySecurityMethods();
  const showSuccessToast = useMoneySecurityToast();
  const codeInputRef = useRef<TextInput>(null);
  const [step, setStep] = useState<SmsSetupStep>(
    route.params?.initialStep ?? 'phone',
  );
  const verificationAction = route.params?.verificationAction;
  const isAdditionalFactorPrompt =
    route.params?.additionalFactorPrompt ?? false;
  const isSecurityVerification = Boolean(verificationAction);
  const isTransactionVerification =
    verificationAction?.type === 'verify-transaction';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const [secondsRemaining, setSecondsRemaining] =
    useState(RESEND_DELAY_SECONDS);
  const phoneDigits = getMoneySmsLocalDigits(phoneNumber);
  const fullPhoneNumber = isSecurityVerification
    ? smsPhoneNumber
    : `+1${phoneDigits}`;
  const isPhoneValid = phoneDigits.length === 10;

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
    if (verificationAction) {
      if (isTransactionVerification && route.params?.fallbackToMethodChooser) {
        navigation.goBack();
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
          params: {
            action: verificationAction,
            showMethodChooser: true,
          },
        });
        return;
      }
      if (isTransactionVerification) {
        showSuccessToast(
          strings('money.security.transaction_verification_required'),
          'error',
        );
        navigation.goBack();
      } else if (
        verificationAction.type === 'enable-transaction-verification' ||
        (verificationAction.type === 'disable-transaction-verification' &&
          verificationAction.returnToMoneyHome)
      ) {
        navigateToMoneyHome();
      } else {
        navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
      }
      return;
    }
    if (step === 'verify') {
      setCode('');
      setIsCodeInvalid(false);
      setStep('phone');
      return;
    }
    if (isAdditionalFactorPrompt) {
      navigateToMoneyHome();
      return;
    }
    navigation.goBack();
  }, [
    isAdditionalFactorPrompt,
    isTransactionVerification,
    navigation,
    navigateToMoneyHome,
    route.params,
    showSuccessToast,
    step,
    verificationAction,
  ]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(formatMoneySmsPhoneNumber(value));
  }, []);

  const handleContinue = useCallback(() => {
    if (isPhoneValid) {
      setSecondsRemaining(RESEND_DELAY_SECONDS);
      setStep('verify');
    }
  }, [isPhoneValid]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setIsCodeInvalid(false);
  }, []);

  const focusCodeInput = useCallback(() => {
    codeInputRef.current?.focus();
  }, []);

  const handleResendCode = useCallback(() => {
    if (secondsRemaining > 0) {
      return;
    }
    setCode('');
    setIsCodeInvalid(false);
    setSecondsRemaining(RESEND_DELAY_SECONDS);
    focusCodeInput();
    showSuccessToast(strings('money.sms_setup.code_resent'));
  }, [focusCodeInput, secondsRemaining, showSuccessToast]);

  useEffect(() => {
    if (step !== 'verify' || secondsRemaining === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((seconds) => {
        if (seconds <= 1) {
          clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, step]);

  const handlePaste = useCallback(() => {
    setCode(String(Math.floor(Math.random() * 999998) + 1).padStart(6, '0'));
    setIsCodeInvalid(false);
    focusCodeInput();
  }, [focusCodeInput]);

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

  const completeSetup = useCallback(() => {
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
        case 'remove-authenticator':
          removeAuthenticator();
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.authenticator_details.removed_toast'),
          });
          return;
        case 'remove-sms':
          removeSms();
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.sms_details.removed_toast'),
          });
          return;
        case 'verify-transaction':
          completePrototypeMoneySend(navigation, showSuccessToast);
          return;
      }
    }
    addSms(fullPhoneNumber);
    const successToast = strings('money.sms_setup.success_toast');
    if (isAdditionalFactorPrompt) {
      navigateToMoneyHome();
      setTimeout(() => showSuccessToast(successToast), 300);
    } else if (route.params?.returnToMoneyHome) {
      markTaskComplete('recovery_method');
      navigateToMoneyHome();
      setTimeout(() => showSuccessToast(successToast), 300);
    } else {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, { successToast });
    }
  }, [
    addSms,
    deletePasskey,
    fullPhoneNumber,
    isAdditionalFactorPrompt,
    markTaskComplete,
    navigation,
    navigateToMoneyHome,
    removeAuthenticator,
    removeEmail,
    removeSms,
    route.params?.returnToMoneyHome,
    setTransactionVerificationEnabled,
    showSuccessToast,
    verificationAction,
  ]);

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
      completeSetup();
    }, 250);
    return () => clearTimeout(timer);
  }, [code, completeSetup, focusCodeInput, step]);

  if (step === 'verify') {
    const codeDescription = strings('money.sms_setup.code_description', {
      phoneNumber: maskMoneySmsPhoneNumber(fullPhoneNumber),
    });

    return (
      <Box
        style={[styles.safeArea, { paddingTop: insets.top }]}
        twClassName="bg-default"
        testID={MoneySmsSetupViewTestIds.CONTAINER}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Box style={styles.verifyHeader}>
            <ButtonIcon
              iconName={
                isTransactionVerification && route.params?.showCloseButton
                  ? IconName.Close
                  : IconName.ArrowLeft
              }
              size={ButtonIconSize.Md}
              onPress={handleBack}
              accessibilityLabel={strings(
                isTransactionVerification && route.params?.showCloseButton
                  ? 'navigation.close'
                  : 'navigation.back',
              )}
              testID={MoneySmsSetupViewTestIds.BACK_BUTTON}
            />
          </Box>

          <Box style={styles.verifyContent}>
            <MoneySecuritySetupTitle>
              {strings('money.sms_setup.verify_title')}
            </MoneySecuritySetupTitle>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              twClassName="mt-2"
            >
              {codeDescription}
            </Text>

            <Pressable
              style={styles.pasteButton}
              onPress={handlePaste}
              accessibilityRole="button"
              testID={MoneySmsSetupViewTestIds.PASTE_BUTTON}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Regular}
              >
                {strings('money.email_code_verification.paste')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.codeInputContainer}
              onPress={focusCodeInput}
              accessibilityRole="button"
              testID={MoneySmsSetupViewTestIds.CODE_ENTRY}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                gap={2}
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
                keyboardType="phone-pad"
                keyboardAppearance={themeAppearance}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                showSoftInputOnFocus={false}
                maxLength={6}
                autoFocus
                caretHidden
                testID={MoneySmsSetupViewTestIds.CODE_INPUT}
                accessibilityLabel={codeDescription}
              />
            </Pressable>
            {isCodeInvalid && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.ErrorDefault}
                twClassName="mt-3"
              >
                {strings('money.security.invalid_code')}
              </Text>
            )}
          </Box>

          <Box style={styles.verifyFooter}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={secondsRemaining > 0}
              onPress={handleResendCode}
              testID={MoneySmsSetupViewTestIds.RESEND_BUTTON}
            >
              {secondsRemaining > 0
                ? strings('money.email_code_verification.resend_countdown', {
                    seconds: secondsRemaining,
                  })
                : strings('money.sms_setup.get_new_code')}
            </Button>
          </Box>

          <Box
            style={[
              keypadStyles.container,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Box style={keypadStyles.rows}>
              {KEYPAD_ROWS.map((row) => (
                <Box
                  key={row.map(({ digit }) => digit).join('')}
                  style={keypadStyles.row}
                >
                  {row.map(({ digit, letters }) => (
                    <Pressable
                      key={digit}
                      style={keypadStyles.key}
                      onPress={() => handleDigitPress(digit)}
                      accessibilityRole="button"
                      accessibilityLabel={digit}
                      testID={`money-sms-code-key-${digit}`}
                    >
                      <Text
                        variant={TextVariant.HeadingMd}
                        fontWeight={FontWeight.Regular}
                        style={keypadStyles.keyNumber}
                      >
                        {digit}
                      </Text>
                      {letters ? (
                        <Text
                          variant={TextVariant.BodyXs}
                          fontWeight={FontWeight.Medium}
                          style={keypadStyles.keyLetters}
                        >
                          {letters}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </Box>
              ))}
              <Box style={keypadStyles.row}>
                <Box style={keypadStyles.specialKey}>
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Regular}
                  >
                    +*#
                  </Text>
                </Box>
                <Pressable
                  style={keypadStyles.key}
                  onPress={() => handleDigitPress('0')}
                  accessibilityRole="button"
                  accessibilityLabel="0"
                  testID="money-sms-code-key-0"
                >
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Regular}
                    style={keypadStyles.keyNumber}
                  >
                    0
                  </Text>
                </Pressable>
                <Pressable
                  style={keypadStyles.specialKey}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  testID="money-sms-code-key-delete"
                >
                  <Icon
                    name={IconName.Backspace}
                    size={IconSize.Lg}
                    color={IconColor.IconDefault}
                  />
                </Pressable>
              </Box>
            </Box>
          </Box>
        </KeyboardAvoidingView>
      </Box>
    );
  }

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySmsSetupViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        {isTransactionVerification && route.params?.showCloseButton ? (
          <Box style={styles.headerSpacer} />
        ) : (
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={MoneySmsSetupViewTestIds.BACK_BUTTON}
          />
        )}
        {isTransactionVerification && route.params?.showCloseButton ? (
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.close')}
            testID={MoneySmsSetupViewTestIds.BACK_BUTTON}
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
          <>
            <MoneySecuritySetupTitle>
              {strings(
                isAdditionalFactorPrompt
                  ? 'money.authenticator.additional_factor_title'
                  : 'money.sms_setup.heading',
              )}
            </MoneySecuritySetupTitle>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName={isAdditionalFactorPrompt ? 'mt-2' : 'mt-2 mb-4'}
            >
              {strings(
                isAdditionalFactorPrompt
                  ? 'money.authenticator.additional_factor_description'
                  : 'money.sms_setup.description',
              )}
            </Text>
            {isAdditionalFactorPrompt && (
              <>
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                  twClassName="mt-6"
                >
                  {strings('money.sms_setup.heading')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="mt-2 mb-4"
                >
                  {strings('money.sms_setup.description')}
                </Text>
              </>
            )}
            <TextField
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder={strings('money.sms_setup.phone_placeholder')}
              autoFocus
              inputProps={{
                keyboardType: 'phone-pad',
                keyboardAppearance: themeAppearance,
                textContentType: 'telephoneNumber',
                autoComplete: 'tel',
                testID: MoneySmsSetupViewTestIds.PHONE_INPUT,
                accessibilityLabel: strings('money.sms_setup.phone_label'),
              }}
            />
          </>
        </ScrollView>

        <Box
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            style={styles.centeredText}
            twClassName="px-2 mb-5"
          >
            {strings('money.sms_setup.privacy')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!isPhoneValid}
            onPress={handleContinue}
            testID={MoneySmsSetupViewTestIds.CONTINUE_BUTTON}
          >
            {strings('money.sms_setup.continue')}
          </Button>
          {isAdditionalFactorPrompt && (
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleNotNow}
              testID={MoneySmsSetupViewTestIds.NOT_NOW_BUTTON}
              twClassName="mt-2"
            >
              {strings('money.authenticator.not_now')}
            </Button>
          )}
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneySmsSetupView;
