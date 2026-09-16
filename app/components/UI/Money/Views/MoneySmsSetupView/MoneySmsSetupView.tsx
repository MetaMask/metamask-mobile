import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  IconName,
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

type SmsSetupStep = 'phone' | 'verify';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  headerSpacer: { width: 40 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  codeInputContainer: {
    position: 'relative',
    height: 64,
    marginTop: 16,
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

const MoneySmsSetupView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneySmsSetup'>>();
  const insets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const { deletePasskey, markTaskComplete } = useMoneyFinishSetup();
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
  const isSecurityVerification = Boolean(verificationAction);
  const isTransactionVerification =
    verificationAction?.type === 'verify-transaction';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const phoneDigits = getMoneySmsLocalDigits(phoneNumber);
  const fullPhoneNumber = isSecurityVerification
    ? smsPhoneNumber
    : `+1${phoneDigits}`;
  const isPhoneValid = phoneDigits.length === 10;

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
    navigation.goBack();
  }, [
    isTransactionVerification,
    navigation,
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
    setCode('');
    setIsCodeInvalid(false);
    focusCodeInput();
    showSuccessToast(strings('money.sms_setup.code_resent'));
  }, [focusCodeInput, showSuccessToast]);

  const completeSetup = useCallback(() => {
    if (verificationAction) {
      switch (verificationAction.type) {
        case 'disable-transaction-verification':
          setTransactionVerificationEnabled(false);
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
          return;
        case 'delete-passkey':
          deletePasskey(verificationAction.passkeyIndex);
          navigation.navigate(Routes.MONEY.PASSKEYS, {
            entryPoint: 'security',
          });
          showSuccessToast(strings('money.passkey_details.removed_toast'));
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
    markTaskComplete('recovery_method');
    const successToast = strings('money.sms_setup.success_toast');
    if (route.params?.returnToMoneyHome) {
      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      setTimeout(() => showSuccessToast(successToast), 300);
    } else {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, { successToast });
    }
  }, [
    addSms,
    deletePasskey,
    fullPhoneNumber,
    markTaskComplete,
    navigation,
    removeAuthenticator,
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
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings(
            step === 'phone'
              ? 'money.sms_setup.title'
              : 'money.sms_setup.verify_title',
          )}
        </Text>
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
          {step === 'phone' ? (
            <>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
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
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mt-3"
              >
                {strings('money.sms_setup.privacy')}
              </Text>
            </>
          ) : (
            <>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('money.sms_setup.code_description', {
                  phoneNumber: maskMoneySmsPhoneNumber(fullPhoneNumber),
                })}
              </Text>

              <Pressable
                style={styles.codeInputContainer}
                onPress={focusCodeInput}
                accessibilityRole="button"
                testID={MoneySmsSetupViewTestIds.CODE_ENTRY}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Between}
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <Box
                      key={index}
                      style={styles.codeCell}
                      twClassName="bg-muted"
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
                  autoComplete="sms-otp"
                  maxLength={6}
                  autoFocus
                  caretHidden
                  testID={MoneySmsSetupViewTestIds.CODE_INPUT}
                />
              </Pressable>
              {isCodeInvalid && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="mt-2"
                >
                  {strings('money.security.invalid_code')}
                </Text>
              )}

              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Md}
                onPress={handleResendCode}
                testID={MoneySmsSetupViewTestIds.RESEND_BUTTON}
                twClassName="self-center mt-5"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('money.sms_setup.resend')}
                </Text>
              </Button>
            </>
          )}
        </ScrollView>

        {step === 'phone' && (
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
              isDisabled={!isPhoneValid}
              onPress={handleContinue}
              testID={MoneySmsSetupViewTestIds.CONTINUE_BUTTON}
            >
              {strings('money.sms_setup.send_code')}
            </Button>
          </Box>
        )}
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneySmsSetupView;
