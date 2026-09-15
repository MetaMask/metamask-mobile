import React, {
  useCallback,
  useContext,
  useEffect,
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
import {
  MONEY_AUTHENTICATOR_SETUP_KEY,
  MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT,
} from '../../constants/moneyAuthenticator';
import { MoneyAuthenticatorViewTestIds } from './MoneyAuthenticatorView.testIds';

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

const MoneyAuthenticatorView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyAuthenticator'>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { markTaskComplete } = useMoneyFinishSetup();
  const { addAuthenticator, isSocialLogin } = useMoneySecurityMethods();
  const codeInputRef = useRef<TextInput>(null);
  const [step, setStep] = useState<AuthenticatorStep>(
    route.params.initialStep ?? 'setup',
  );
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);

  const handleBack = useCallback(() => {
    if (step === 'verify') {
      setStep('setup');
      setIsCodeInvalid(false);
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setIsCodeInvalid(false);
  }, []);

  const focusCodeInput = useCallback(() => {
    codeInputRef.current?.focus();
  }, []);

  const showSuccessToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ComponentIconName.Check,
        iconColor: colors.success.default,
        hasNoTimeout: false,
        labelOptions: [
          {
            label,
            isBold: true,
          },
        ],
      });
    },
    [colors.success.default, toastRef],
  );

  const handleCopyKey = useCallback(async () => {
    await ClipboardManager.setString(MONEY_AUTHENTICATOR_SETUP_KEY_COMPACT);
    setStep('verify');
    setTimeout(
      () => showSuccessToast(strings('money.authenticator.copied')),
      100,
    );
  }, [showSuccessToast]);

  const handleVerify = useCallback(() => {
    addAuthenticator();
    markTaskComplete('recovery_method');
    const successToast = strings('money.authenticator.success_toast');

    if (route.params.entryPoint === 'finish_setup') {
      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      setTimeout(() => showSuccessToast(successToast), 300);
    } else {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY, { successToast });
    }
  }, [
    addAuthenticator,
    markTaskComplete,
    navigation,
    route.params.entryPoint,
    showSuccessToast,
  ]);

  const handleAlternativeMethod = useCallback(() => {
    navigation.navigate(Routes.MONEY.SMS_SETUP, {
      returnToMoneyHome: true,
    });
  }, [navigation]);

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
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneyAuthenticatorViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.authenticator.header')}
        </Text>
        {step === 'setup' ? (
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
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
              >
                {strings('money.authenticator.how_to_setup_title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-2"
              >
                {strings('money.authenticator.instruction_combined')}
              </Text>

              <Box twClassName="mt-6 rounded-xl bg-muted p-4">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.authenticator.setup_key')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  style={styles.setupKey}
                  twClassName="mt-3"
                >
                  {MONEY_AUTHENTICATOR_SETUP_KEY}
                </Text>
              </Box>

              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleCopyKey}
                testID={MoneyAuthenticatorViewTestIds.COPY_BUTTON}
                twClassName="mt-4"
              >
                {strings('money.authenticator.copy_key_link')}
              </Button>
            </>
          ) : (
            <>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
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
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
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

        {step === 'setup' &&
          route.params.entryPoint === 'finish_setup' &&
          isSocialLogin && (
            <Box
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleAlternativeMethod}
                testID={MoneyAuthenticatorViewTestIds.ALTERNATIVE_BUTTON}
              >
                {strings('money.authenticator.use_sms_instead')}
              </Button>
            </Box>
          )}
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneyAuthenticatorView;
