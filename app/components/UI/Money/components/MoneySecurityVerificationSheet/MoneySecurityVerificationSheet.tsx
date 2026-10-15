import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import BigNumber from 'bignumber.js';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  type RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
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
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { useMoneySecurityToast } from '../../hooks/useMoneySecurityToast';
import type { MoneyModalsNavigationParamList } from '../../types/navigation';
import { completePrototypeMoneySend } from '../../utils/completePrototypeMoneySend';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneySecurityVerificationSheetTestIds } from './MoneySecurityVerificationSheet.testIds';
import MoneySecuritySetupImage from '../../../../../images/money-security-setup.png';
import { MONEY_PASSKEY_METHOD_NAMES } from '../../constants/moneyPasskey';

type VerificationMethod = 'passkey' | 'email' | 'authenticator' | 'sms';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  method: {
    minHeight: 56,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  codeInputContainer: {
    position: 'relative',
    height: 64,
    marginTop: 24,
  },
  codeInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
  },
  codeCell: {
    width: 52,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  transactionContent: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  transactionArtwork: {
    width: 96,
    height: 96,
  },
  transactionDescription: {
    textAlign: 'center',
    marginTop: 12,
  },
  transactionPrimaryButton: {
    marginTop: 20,
  },
  passkeyContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  passkeyHeroIcon: {
    height: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  passkeyDescription: {
    marginTop: 20,
  },
  passkeyStatus: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyDoneRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type PasskeyVerificationStep = 'signing' | 'done' | null;

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email;
  }
  return `${localPart[0]}••••@${domain}`;
};

interface MethodButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
  isPrimary?: boolean;
}

const MethodButton = ({
  icon,
  label,
  onPress,
  testID,
  isPrimary = false,
}: MethodButtonProps) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: isPrimary }}
  >
    <Box
      style={styles.method}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={`rounded-xl px-4 gap-3 ${
        isPrimary ? 'bg-icon-default' : 'bg-muted'
      }`}
    >
      <Icon
        name={icon}
        size={IconSize.Md}
        color={isPrimary ? IconColor.PrimaryInverse : IconColor.IconDefault}
      />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isPrimary ? TextColor.PrimaryInverse : TextColor.TextDefault}
      >
        {label}
      </Text>
    </Box>
  </Pressable>
);

const MoneySecurityVerificationSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        MoneyModalsNavigationParamList,
        'MoneySecurityVerificationSheet'
      >
    >();
  const { colors, themeAppearance } = useTheme();
  const {
    deletePasskey,
    isEmailVerified,
    moneyEmail,
    passkeyCount,
    passkeys,
    removeEmail,
  } = useMoneyFinishSetup();
  const {
    defaultVerificationMethod,
    isAuthenticatorAdded,
    isSmsAdded,
    removeAuthenticator,
    removeSms,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);
  const showSuccessToast = useMoneySecurityToast();
  const codeInputRef = useRef<TextInput>(null);
  const hasCompletedRef = useRef(false);
  const isRoutingToMethodRef = useRef(false);
  const hasAutoRoutedAuthenticatorRef = useRef(false);
  const hasAutoRoutedSmsRef = useRef(false);
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const [passkeyVerificationStep, setPasskeyVerificationStep] =
    useState<PasskeyVerificationStep>(null);
  const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);

  const availableMethods = useMemo(() => {
    const methods: VerificationMethod[] = [];
    const { action } = route.params;

    if (passkeyCount - (action.type === 'delete-passkey' ? 1 : 0) > 0) {
      methods.push('passkey');
    }
    if (isEmailVerified && action.type !== 'remove-email') {
      methods.push('email');
    }
    if (isAuthenticatorAdded && action.type !== 'remove-authenticator') {
      methods.push('authenticator');
    }
    if (isSmsAdded && action.type !== 'remove-sms') {
      methods.push('sms');
    }

    return methods;
  }, [
    isAuthenticatorAdded,
    isEmailVerified,
    isSmsAdded,
    passkeyCount,
    route.params,
  ]);

  const isTransactionVerification =
    route.params.action.type === 'verify-transaction';
  const usesUpdatedVerificationChooser =
    isTransactionVerification ||
    route.params.action.type === 'enable-transaction-verification' ||
    route.params.action.type === 'disable-transaction-verification' ||
    route.params.action.type === 'remove-authenticator' ||
    route.params.action.type === 'remove-sms';
  const transactionAmount =
    route.params.action.type === 'verify-transaction'
      ? moneyFormatUsd(new BigNumber(route.params.action.amountFiat || '20'))
      : undefined;
  const configuredDefaultMethod: VerificationMethod =
    defaultVerificationMethod === 'passkeys'
      ? 'passkey'
      : defaultVerificationMethod;
  const resolvedDefaultMethod = availableMethods.includes(
    configuredDefaultMethod,
  )
    ? configuredDefaultMethod
    : availableMethods[0];

  const [selectedMethod, setSelectedMethod] =
    useState<VerificationMethod | null>(
      route.params.showMethodChooser && availableMethods.length > 1
        ? null
        : isTransactionVerification
          ? isEmailVerified && availableMethods.includes('passkey')
            ? null
            : resolvedDefaultMethod
          : availableMethods.length === 1
            ? availableMethods[0]
            : null,
    );

  const showTransactionVerificationError = useCallback(() => {
    showSuccessToast(
      strings('money.security.transaction_verification_required'),
      'error',
    );
  }, [showSuccessToast]);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(
      isTransactionVerification ? showTransactionVerificationError : undefined,
    );
  }, [isTransactionVerification, showTransactionVerificationError]);

  const handleSheetGoBack = useCallback(() => {
    if (isRoutingToMethodRef.current || hasCompletedRef.current) {
      navigation.goBack();
      return;
    }
    if (isTransactionVerification) {
      if (selectedMethod && availableMethods.length > 1) {
        navigation.goBack();
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
          params: {
            action: route.params.action,
            showMethodChooser: true,
          },
        });
        return;
      }
      showTransactionVerificationError();
    }
    navigation.goBack();
  }, [
    availableMethods.length,
    isTransactionVerification,
    navigation,
    route.params.action,
    selectedMethod,
    showTransactionVerificationError,
  ]);

  const completeAction = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }
    hasCompletedRef.current = true;

    const { action } = route.params;
    let destination: () => void;

    switch (action.type) {
      case 'disable-transaction-verification':
        setTransactionVerificationEnabled(false);
        destination = action.returnToPrevious
          ? () => {
              setTimeout(
                () =>
                  showSuccessToast(
                    strings('money.security.disabled_success_toast'),
                  ),
                300,
              );
            }
          : action.returnToMoneyHome
            ? () => {
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
              }
            : () => navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
        break;
      case 'enable-transaction-verification':
        setTransactionVerificationEnabled(true);
        destination = action.returnToPrevious
          ? () => {
              setTimeout(
                () =>
                  showSuccessToast(
                    strings('money.security.enabled_success_toast'),
                  ),
                300,
              );
            }
          : () => {
              navigation.navigate(Routes.HOME_TABS, {
                screen: Routes.MONEY.ROOT,
                params: { screen: Routes.MONEY.HOME },
              });
              setTimeout(
                () =>
                  showSuccessToast(
                    strings('money.security.enabled_success_toast'),
                  ),
                300,
              );
            };
        break;
      case 'delete-passkey':
        deletePasskey(action.passkeyIndex);
        destination = () => {
          navigation.navigate(Routes.MONEY.PASSKEYS, {
            entryPoint: 'security',
          });
          showSuccessToast(strings('money.passkey_details.removed_toast'));
        };
        break;
      case 'remove-email':
        removeEmail();
        destination = () =>
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.email_details.removed_toast'),
          });
        break;
      case 'remove-authenticator':
        removeAuthenticator();
        destination = () =>
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.authenticator_details.removed_toast'),
          });
        break;
      case 'remove-sms':
        removeSms();
        destination = () =>
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.sms_details.removed_toast'),
          });
        break;
      case 'verify-transaction':
        {
          const parentNavigation =
            navigation.getParent<AppNavigationProp>() ?? navigation;
          setIsCompletingTransaction(true);
          setTimeout(
            () =>
              completePrototypeMoneySend(parentNavigation, showSuccessToast),
            50,
          );
        }
        return;
    }

    sheetRef.current?.onCloseBottomSheet(destination);
  }, [
    deletePasskey,
    navigation,
    removeAuthenticator,
    removeEmail,
    removeSms,
    route.params,
    setTransactionVerificationEnabled,
    showSuccessToast,
  ]);

  const handleBack = useCallback(() => {
    setSelectedMethod(null);
    setCode('');
    setIsCodeInvalid(false);
  }, []);

  const handleTransactionMethodDismiss = useCallback(() => {
    if (availableMethods.length > 1) {
      handleBack();
      return;
    }
    closeSheet();
  }, [availableMethods.length, closeSheet, handleBack]);

  const handleAuthenticatorMethod = useCallback(
    (showCloseButton = false) => {
      isRoutingToMethodRef.current = true;
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
          entryPoint: 'security',
          initialStep: 'verify',
          verificationAction: route.params.action,
          ...(isTransactionVerification
            ? {
                fallbackToMethodChooser: availableMethods.length > 1,
                showCloseButton,
              }
            : {}),
        });
      });
    },
    [
      availableMethods.length,
      isTransactionVerification,
      navigation,
      route.params.action,
    ],
  );

  const handleSmsMethod = useCallback(
    (showCloseButton = false) => {
      isRoutingToMethodRef.current = true;
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.MONEY.SMS_SETUP, {
          initialStep: 'verify',
          verificationAction: route.params.action,
          ...(isTransactionVerification
            ? {
                fallbackToMethodChooser: availableMethods.length > 1,
                showCloseButton,
              }
            : {}),
        });
      });
    },
    [
      availableMethods.length,
      isTransactionVerification,
      navigation,
      route.params.action,
    ],
  );

  const handleEmailMethod = useCallback(() => {
    isRoutingToMethodRef.current = true;
    if (isTransactionVerification) {
      const parentNavigation =
        navigation.getParent<AppNavigationProp>() ?? navigation;
      parentNavigation.reset({
        index: 1,
        routes: [
          {
            name: Routes.HOME_TABS,
            params: {
              screen: Routes.MONEY.ROOT,
              params: { screen: Routes.MONEY.HOME },
            },
          },
          {
            name: Routes.MONEY.EMAIL_CODE_VERIFICATION,
            params: {
              email: moneyEmail,
              verificationAction: route.params.action,
            },
          },
        ],
      });
      return;
    }
    navigation.dispatch(
      StackActions.replace(Routes.MONEY.EMAIL_CODE_VERIFICATION, {
        email: moneyEmail,
        verificationAction: route.params.action,
      }),
    );
  }, [isTransactionVerification, moneyEmail, navigation, route.params.action]);

  const verificationCodeMethod = (
    ['email', 'sms', 'authenticator'] as VerificationMethod[]
  ).find((method) => availableMethods.includes(method));

  const handleVerificationCodeMethod = useCallback(() => {
    switch (verificationCodeMethod) {
      case 'email':
        handleEmailMethod();
        break;
      case 'sms':
        handleSmsMethod();
        break;
      case 'authenticator':
        handleAuthenticatorMethod();
        break;
      default:
        break;
    }
  }, [
    handleAuthenticatorMethod,
    handleEmailMethod,
    handleSmsMethod,
    verificationCodeMethod,
  ]);

  useEffect(() => {
    if (
      selectedMethod !== 'authenticator' ||
      hasAutoRoutedAuthenticatorRef.current
    ) {
      return;
    }

    hasAutoRoutedAuthenticatorRef.current = true;
    handleAuthenticatorMethod(true);
  }, [handleAuthenticatorMethod, selectedMethod]);

  useEffect(() => {
    if (selectedMethod !== 'sms' || hasAutoRoutedSmsRef.current) {
      return;
    }
    hasAutoRoutedSmsRef.current = true;
    handleSmsMethod(true);
  }, [handleSmsMethod, selectedMethod]);

  const selectMethod = useCallback(
    (method: VerificationMethod) => {
      if (method === 'authenticator') {
        handleAuthenticatorMethod();
        return;
      }
      if (method === 'sms') {
        handleSmsMethod();
        return;
      }
      setSelectedMethod(method);
    },
    [handleAuthenticatorMethod, handleSmsMethod],
  );

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setIsCodeInvalid(false);
  }, []);

  useEffect(() => {
    if (selectedMethod !== 'passkey') {
      setPasskeyVerificationStep(null);
      return undefined;
    }
    if (passkeyVerificationStep === null) {
      setPasskeyVerificationStep('signing');
      return undefined;
    }
    if (passkeyVerificationStep === 'signing') {
      const timer = setTimeout(() => setPasskeyVerificationStep('done'), 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(completeAction, 900);
    return () => clearTimeout(timer);
  }, [completeAction, passkeyVerificationStep, selectedMethod]);

  useEffect(() => {
    if (
      (selectedMethod !== 'sms' && selectedMethod !== 'email') ||
      code.length !== 6
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (code === '000000') {
        setCode('');
        setIsCodeInvalid(true);
        codeInputRef.current?.focus();
        return;
      }
      completeAction();
    }, 250);

    return () => clearTimeout(timer);
  }, [code, completeAction, selectedMethod]);

  const getMethodIcon = (method: VerificationMethod) => {
    switch (method) {
      case 'passkey':
        return IconName.Key;
      case 'email':
        return IconName.Mail;
      case 'authenticator':
        return IconName.QrCode;
      case 'sms':
        return IconName.Mobile;
    }
  };

  const getMethodLabel = (method: VerificationMethod) => {
    switch (method) {
      case 'passkey':
        return strings('money.security.verify_with_passkey');
      case 'email':
        return strings('money.security.verify_with_email');
      case 'authenticator':
        return strings('money.security.verify_with_authenticator');
      case 'sms':
        return strings('money.security.verify_with_sms');
    }
  };

  const getMethodTestId = (method: VerificationMethod) => {
    switch (method) {
      case 'passkey':
        return MoneySecurityVerificationSheetTestIds.PASSKEY_METHOD;
      case 'email':
        return MoneySecurityVerificationSheetTestIds.EMAIL_METHOD;
      case 'authenticator':
        return MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD;
      case 'sms':
        return MoneySecurityVerificationSheetTestIds.SMS_METHOD;
    }
  };

  const renderMethodButton = (
    method: VerificationMethod,
    isPrimary = false,
  ) => (
    <MethodButton
      key={method}
      icon={getMethodIcon(method)}
      label={getMethodLabel(method)}
      onPress={() => selectMethod(method)}
      testID={getMethodTestId(method)}
      isPrimary={isPrimary}
    />
  );

  const alternativeMethods = availableMethods.filter(
    (method) => method !== resolvedDefaultMethod,
  );
  const codeDescription = strings(
    selectedMethod === 'email'
      ? 'money.security.email_code_description'
      : 'money.security.sms_code_description',
  );

  if (isCompletingTransaction) {
    return null;
  }

  if (selectedMethod === 'passkey') {
    const passkeyMethod = passkeys[0]?.method ?? 'passwords';
    const account = moneyEmail ? maskEmail(moneyEmail) : 'your Money account';

    return (
      <BottomSheet
        ref={sheetRef}
        goBack={handleSheetGoBack}
        testID={MoneySecurityVerificationSheetTestIds.CONTAINER}
      >
        <BottomSheetHeader onClose={handleTransactionMethodDismiss}>
          {null}
        </BottomSheetHeader>
        <Box style={styles.passkeyContent}>
          <Box style={styles.passkeyHeroIcon} accessibilityElementsHidden>
            <Icon
              name={IconName.FaceId}
              size={IconSize.Xl}
              color={IconColor.PrimaryDefault}
            />
          </Box>
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {strings('money.security.passkey_verification_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            style={styles.passkeyDescription}
          >
            {strings('money.security.passkey_verification_description', {
              account,
              method: MONEY_PASSKEY_METHOD_NAMES[passkeyMethod],
            })}
          </Text>
          <Box style={styles.passkeyStatus}>
            {passkeyVerificationStep === 'done' ? (
              <>
                <Box
                  style={[
                    styles.passkeyDoneRing,
                    { borderColor: colors.primary.default },
                  ]}
                >
                  <Icon
                    name={IconName.CheckBold}
                    size={IconSize.Xl}
                    color={IconColor.PrimaryDefault}
                  />
                </Box>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                  twClassName="mt-2"
                >
                  {strings('money.add_passkey_sheet.done')}
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator
                  size="large"
                  color={colors.primary.default}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                  twClassName="mt-3"
                >
                  {strings('money.add_passkey_sheet.signing_in')}
                </Text>
              </>
            )}
          </Box>
        </Box>
      </BottomSheet>
    );
  }

  if (
    usesUpdatedVerificationChooser &&
    !selectedMethod &&
    availableMethods.includes('passkey') &&
    verificationCodeMethod
  ) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={handleSheetGoBack}
        testID={MoneySecurityVerificationSheetTestIds.CONTAINER}
      >
        <BottomSheetHeader onClose={closeSheet}>{null}</BottomSheetHeader>
        <Box style={styles.transactionContent}>
          <Box alignItems={BoxAlignItems.Center}>
            <Image
              source={MoneySecuritySetupImage}
              style={styles.transactionArtwork}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
              twClassName="mt-4"
            >
              {strings('money.security.transaction_confirmation_title')}
            </Text>
            {isTransactionVerification ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.transactionDescription}
              >
                {strings(
                  'money.security.transaction_confirmation_description',
                  { amount: transactionAmount },
                )}
              </Text>
            ) : null}
          </Box>

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            startIconName={IconName.FaceId}
            onPress={() => setSelectedMethod('passkey')}
            testID={MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON}
            style={styles.transactionPrimaryButton}
            twClassName="bg-icon-default"
          >
            {strings('money.security.transaction_verify_with_passkey')}
          </Button>

          {verificationCodeMethod ? (
            <>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={3}
                twClassName="my-3"
              >
                <Box style={styles.divider} twClassName="bg-border-muted" />
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.security.verification_or')}
                </Text>
                <Box style={styles.divider} twClassName="bg-border-muted" />
              </Box>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleVerificationCodeMethod}
                testID={MoneySecurityVerificationSheetTestIds.EMAIL_METHOD}
                twClassName="bg-muted"
              >
                {strings('money.security.transaction_get_verification_code')}
              </Button>
            </>
          ) : null}
        </Box>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleSheetGoBack}
      testID={MoneySecurityVerificationSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader
        onBack={
          selectedMethod &&
          availableMethods.length > 1 &&
          !isTransactionVerification
            ? handleBack
            : undefined
        }
        onClose={
          isTransactionVerification && selectedMethod
            ? handleTransactionMethodDismiss
            : closeSheet
        }
      >
        {strings('money.security.verification_title')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        {selectedMethod === 'authenticator' ||
        selectedMethod === 'sms' ? null : !selectedMethod ? (
          isTransactionVerification ? (
            <>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('money.security.verification_description')}
              </Text>
              <Box twClassName="mt-6 gap-3">
                {resolvedDefaultMethod &&
                  renderMethodButton(resolvedDefaultMethod, true)}
                {alternativeMethods.length > 0 && (
                  <>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      gap={3}
                    >
                      <Box
                        style={styles.divider}
                        twClassName="bg-border-muted"
                      />
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings('money.security.verification_or')}
                      </Text>
                      <Box
                        style={styles.divider}
                        twClassName="bg-border-muted"
                      />
                    </Box>
                    {alternativeMethods.map((method) =>
                      renderMethodButton(method),
                    )}
                  </>
                )}
              </Box>
            </>
          ) : (
            <>
              {availableMethods.length > 1 && (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.security.verification_description')}
                </Text>
              )}
              <Box
                twClassName={
                  availableMethods.length > 1 ? 'mt-6 gap-3' : 'gap-3'
                }
              >
                {availableMethods.map((method) => renderMethodButton(method))}
              </Box>
            </>
          )
        ) : (
          <>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {codeDescription}
            </Text>
            <Pressable
              style={styles.codeInputContainer}
              onPress={() => codeInputRef.current?.focus()}
              accessibilityRole="button"
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
                style={styles.codeInput}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                keyboardAppearance={themeAppearance}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                caretHidden
                testID={MoneySecurityVerificationSheetTestIds.CODE_INPUT}
                accessibilityLabel={codeDescription}
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
          </>
        )}
      </Box>
    </BottomSheet>
  );
};

export default MoneySecurityVerificationSheet;
