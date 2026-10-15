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
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
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
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { useMoneySecurityToast } from '../../hooks/useMoneySecurityToast';
import { completePrototypeMoneySend } from '../../utils/completePrototypeMoneySend';
import { MoneyEmailCodeVerificationViewTestIds } from './MoneyEmailCodeVerificationView.testIds';

type VerificationError = 'incorrect' | 'expired' | null;

const RESEND_DELAY_SECONDS = 30;
const CODE_LENGTH = 6;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  codeEntry: {
    position: 'relative',
    height: 64,
    marginTop: 8,
  },
  codeCell: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenCodeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
  },
  footer: {
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
    keypadRows: {
      gap: 7,
    },
    keypadRow: {
      flexDirection: 'row',
      gap: 7,
    },
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
    keyNumber: {
      lineHeight: 27,
    },
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

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  if (!domain || !localPart) {
    return email;
  }

  if (localPart.length === 1) {
    return `${localPart}•••@${domain}`;
  }

  return `${localPart[0]}•••${localPart.at(-1)}@${domain}`;
};

const MoneyEmailCodeVerificationView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<MoneyNavigationParamList, 'MoneyEmailCodeVerification'>
    >();
  const insets = useSafeAreaInsets();
  const { themeAppearance } = useTheme();
  const { markEmailVerified, passkeyCount } = useMoneyFinishSetup();
  const { removeAuthenticator, removeSms, setTransactionVerificationEnabled } =
    useMoneySecurityMethods(passkeyCount);
  const showSuccessToast = useMoneySecurityToast();
  const keypadStyles = useMemo(
    () => createKeypadStyles(themeAppearance === 'dark'),
    [themeAppearance],
  );
  const codeInputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<VerificationError>(null);
  const [secondsRemaining, setSecondsRemaining] =
    useState(RESEND_DELAY_SECONDS);
  const maskedEmail = useMemo(() => maskEmail(route.params.email), [route]);
  const isExpired = error === 'expired';
  const canResend = secondsRemaining === 0 || isExpired;

  const focusCodeInput = useCallback(() => {
    codeInputRef.current?.focus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const focusTimer = setTimeout(focusCodeInput, 350);
      return () => clearTimeout(focusTimer);
    }, [focusCodeInput]),
  );

  useEffect(() => {
    if (isExpired) {
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
  }, [isExpired]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
    setError(null);
  }, []);

  const handlePaste = useCallback(() => {
    const prototypeCode = String(
      Math.floor(Math.random() * 999998) + 1,
    ).padStart(CODE_LENGTH, '0');
    handleCodeChange(prototypeCode);
    focusCodeInput();
  }, [focusCodeInput, handleCodeChange]);

  const handleSuccess = useCallback(() => {
    if (route.params.verificationAction?.type === 'remove-authenticator') {
      removeAuthenticator();
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
        successToast: strings('money.authenticator_details.removed_toast'),
      });
      return;
    }

    if (route.params.verificationAction?.type === 'remove-sms') {
      removeSms();
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
        successToast: strings('money.sms_details.removed_toast'),
      });
      return;
    }

    if (route.params.verificationAction?.type === 'verify-transaction') {
      completePrototypeMoneySend(navigation, showSuccessToast);
      return;
    }

    if (
      route.params.verificationAction?.type ===
      'enable-transaction-verification'
    ) {
      setTransactionVerificationEnabled(true);
      if (route.params.verificationAction.returnToPrevious) {
        navigation.goBack();
      } else {
        navigation.navigate(Routes.HOME_TABS, {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        });
      }
      setTimeout(
        () => showSuccessToast(strings('money.security.enabled_success_toast')),
        300,
      );
      return;
    }

    if (
      route.params.verificationAction?.type ===
      'disable-transaction-verification'
    ) {
      setTransactionVerificationEnabled(false);
      if (route.params.verificationAction.returnToPrevious) {
        navigation.goBack();
        setTimeout(
          () =>
            showSuccessToast(strings('money.security.disabled_success_toast')),
          300,
        );
      } else if (route.params.verificationAction.returnToMoneyHome) {
        navigation.navigate(Routes.HOME_TABS, {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        });
        setTimeout(
          () =>
            showSuccessToast(strings('money.security.disabled_success_toast')),
          300,
        );
      } else {
        navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
      }
      return;
    }

    markEmailVerified(route.params.email);
    if (route.params.returnToSecurity) {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
        successToast: strings('money.email_code_verification.success_toast'),
      });
      return;
    }

    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    setTimeout(
      () =>
        showSuccessToast(
          strings('money.email_code_verification.success_toast'),
        ),
      300,
    );
  }, [
    markEmailVerified,
    navigation,
    removeAuthenticator,
    removeSms,
    route.params.email,
    route.params.returnToSecurity,
    route.params.verificationAction,
    setTransactionVerificationEnabled,
    showSuccessToast,
  ]);

  const handleVerify = useCallback(() => {
    if (code === '000000') {
      setCode('');
      setError('incorrect');
      focusCodeInput();
      return;
    }

    if (code === '999999') {
      setCode('');
      setError('expired');
      setSecondsRemaining(0);
      focusCodeInput();
      return;
    }

    if (code.length === CODE_LENGTH) {
      handleSuccess();
    }
  }, [code, focusCodeInput, handleSuccess]);

  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify();
    }
  }, [code, handleVerify]);

  const handleResend = useCallback(() => {
    if (!canResend) {
      return;
    }

    setCode('');
    setError(null);
    setSecondsRemaining(RESEND_DELAY_SECONDS);
    focusCodeInput();
  }, [canResend, focusCodeInput]);

  const handleDigitPress = useCallback((digit: string) => {
    setCode((currentCode) => {
      if (currentCode.length >= CODE_LENGTH) {
        return currentCode;
      }
      return `${currentCode}${digit}`;
    });
    setError(null);
  }, []);

  const handleDelete = useCallback(() => {
    setCode((currentCode) => currentCode.slice(0, -1));
    setError(null);
  }, []);

  const resendLabel =
    secondsRemaining > 0
      ? strings('money.email_code_verification.resend_countdown', {
          seconds: secondsRemaining,
        })
      : strings('money.email_code_verification.resend');

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyEmailCodeVerificationViewTestIds.CONTAINER}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Box style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => navigation.goBack()}
            accessibilityLabel={strings('money.email_code_verification.back')}
            testID={MoneyEmailCodeVerificationViewTestIds.BACK_BUTTON}
          />
        </Box>

        <Box style={styles.content}>
          <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
            {strings('money.email_code_verification.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
          >
            {strings('money.email_code_verification.description', {
              email: maskedEmail,
            })}
          </Text>

          <Pressable
            style={styles.pasteButton}
            onPress={handlePaste}
            accessibilityRole="button"
            testID={MoneyEmailCodeVerificationViewTestIds.PASTE_BUTTON}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Regular}>
              {strings('money.email_code_verification.paste')}
            </Text>
          </Pressable>

          <Pressable
            style={styles.codeEntry}
            onPress={focusCodeInput}
            accessibilityRole="button"
            testID={MoneyEmailCodeVerificationViewTestIds.CODE_ENTRY}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              gap={2}
            >
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
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
              value={code}
              onChangeText={handleCodeChange}
              style={styles.hiddenCodeInput}
              keyboardType="phone-pad"
              keyboardAppearance={themeAppearance}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              showSoftInputOnFocus={false}
              maxLength={CODE_LENGTH}
              caretHidden
              testID={MoneyEmailCodeVerificationViewTestIds.CODE_INPUT}
            />
          </Pressable>

          {error && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              color={TextColor.ErrorDefault}
              twClassName="mt-3"
            >
              {strings(
                error === 'expired'
                  ? 'money.email_code_verification.expired_error'
                  : 'money.email_code_verification.incorrect_error',
              )}
            </Text>
          )}
        </Box>

        <Box style={styles.footer}>
          {isExpired ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleResend}
              testID={MoneyEmailCodeVerificationViewTestIds.RESEND_BUTTON}
            >
              {strings('money.email_code_verification.get_new_code')}
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!canResend}
              onPress={handleResend}
              testID={MoneyEmailCodeVerificationViewTestIds.RESEND_BUTTON}
            >
              {resendLabel}
            </Button>
          )}
        </Box>

        <Box
          style={[
            keypadStyles.container,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Box style={keypadStyles.keypadRows}>
            {KEYPAD_ROWS.map((row) => (
              <Box
                key={row.map(({ digit }) => digit).join('')}
                style={keypadStyles.keypadRow}
              >
                {row.map(({ digit, letters }) => (
                  <Pressable
                    key={digit}
                    style={keypadStyles.key}
                    onPress={() => handleDigitPress(digit)}
                    accessibilityRole="button"
                    accessibilityLabel={digit}
                    testID={`money-email-code-key-${digit}`}
                  >
                    <Text
                      variant={TextVariant.HeadingMd}
                      fontWeight={FontWeight.Regular}
                      style={keypadStyles.keyNumber}
                    >
                      {digit}
                    </Text>
                    {letters && (
                      <Text
                        variant={TextVariant.BodyXs}
                        fontWeight={FontWeight.Medium}
                        style={keypadStyles.keyLetters}
                      >
                        {letters}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </Box>
            ))}
            <Box style={keypadStyles.keypadRow}>
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
                testID="money-email-code-key-0"
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
                testID="money-email-code-key-delete"
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
};

export default MoneyEmailCodeVerificationView;
