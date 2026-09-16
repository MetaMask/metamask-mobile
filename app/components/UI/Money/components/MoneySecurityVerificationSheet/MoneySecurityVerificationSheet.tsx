import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import {
  type RouteProp,
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
import { MoneySecurityVerificationSheetTestIds } from './MoneySecurityVerificationSheet.testIds';

type VerificationMethod = 'passkey' | 'authenticator' | 'sms';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  method: {
    minHeight: 56,
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
});

interface MethodButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}

const MethodButton = ({ icon, label, onPress, testID }: MethodButtonProps) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Box
      style={styles.method}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="rounded-xl bg-muted px-4 gap-3"
    >
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
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
  const { themeAppearance } = useTheme();
  const { deletePasskey, passkeyCount } = useMoneyFinishSetup();
  const {
    isAuthenticatorAdded,
    isSmsAdded,
    removeAuthenticator,
    removeSms,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);
  const showSuccessToast = useMoneySecurityToast();
  const codeInputRef = useRef<TextInput>(null);
  const hasCompletedRef = useRef(false);
  const hasAutoRoutedAuthenticatorRef = useRef(false);
  const [code, setCode] = useState('');
  const [isCodeInvalid, setIsCodeInvalid] = useState(false);
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);

  const availableMethods = useMemo(() => {
    const methods: VerificationMethod[] = [];
    const { action } = route.params;

    if (passkeyCount - (action.type === 'delete-passkey' ? 1 : 0) > 0) {
      methods.push('passkey');
    }
    if (isAuthenticatorAdded && action.type !== 'remove-authenticator') {
      methods.push('authenticator');
    }
    if (isSmsAdded && action.type !== 'remove-sms') {
      methods.push('sms');
    }

    return methods;
  }, [isAuthenticatorAdded, isSmsAdded, passkeyCount, route.params]);

  const isSoleAuthenticatorMethod =
    availableMethods.length === 1 && availableMethods[0] === 'authenticator';

  const [selectedMethod, setSelectedMethod] =
    useState<VerificationMethod | null>(
      availableMethods.length === 1 && !isSoleAuthenticatorMethod
        ? availableMethods[0]
        : null,
    );

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

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
        destination = () => navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
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
    }

    sheetRef.current?.onCloseBottomSheet(destination);
  }, [
    deletePasskey,
    navigation,
    removeAuthenticator,
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

  const handleAuthenticatorMethod = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
        entryPoint: 'security',
        initialStep: 'verify',
        verificationAction: route.params.action,
      });
    });
  }, [navigation, route.params.action]);

  useEffect(() => {
    if (!isSoleAuthenticatorMethod || hasAutoRoutedAuthenticatorRef.current) {
      return;
    }

    hasAutoRoutedAuthenticatorRef.current = true;
    handleAuthenticatorMethod();
  }, [handleAuthenticatorMethod, isSoleAuthenticatorMethod]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setIsCodeInvalid(false);
  }, []);

  useEffect(() => {
    if (!isVerifyingPasskey) {
      return undefined;
    }
    const timer = setTimeout(completeAction, 700);
    return () => clearTimeout(timer);
  }, [completeAction, isVerifyingPasskey]);

  useEffect(() => {
    if (selectedMethod !== 'sms' || code.length !== 6) {
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

  const codeDescription = strings('money.security.sms_code_description');

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      testID={MoneySecurityVerificationSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader
        onBack={
          selectedMethod && availableMethods.length > 1 ? handleBack : undefined
        }
        onClose={closeSheet}
      >
        {strings('money.security.verification_title')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        {isSoleAuthenticatorMethod ? null : !selectedMethod ? (
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
              twClassName={availableMethods.length > 1 ? 'mt-6 gap-3' : 'gap-3'}
            >
              {availableMethods.includes('passkey') && (
                <MethodButton
                  icon={IconName.Key}
                  label={strings('money.security.verify_with_passkey')}
                  onPress={() => setSelectedMethod('passkey')}
                  testID={MoneySecurityVerificationSheetTestIds.PASSKEY_METHOD}
                />
              )}
              {availableMethods.includes('authenticator') && (
                <MethodButton
                  icon={IconName.QrCode}
                  label={strings('money.security.verify_with_authenticator')}
                  onPress={handleAuthenticatorMethod}
                  testID={
                    MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD
                  }
                />
              )}
              {availableMethods.includes('sms') && (
                <MethodButton
                  icon={IconName.Mobile}
                  label={strings('money.security.verify_with_sms')}
                  onPress={() => setSelectedMethod('sms')}
                  testID={MoneySecurityVerificationSheetTestIds.SMS_METHOD}
                />
              )}
            </Box>
          </>
        ) : selectedMethod === 'passkey' ? (
          <>
            <Box alignItems={BoxAlignItems.Center} twClassName="gap-4">
              <Icon
                name={IconName.FaceId}
                size={IconSize.Xl}
                color={IconColor.PrimaryDefault}
              />
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                style={styles.centeredText}
              >
                {strings('money.security.verify_with_passkey')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.centeredText}
              >
                {strings('money.security.verify_with_passkey_description')}
              </Text>
            </Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={isVerifyingPasskey}
              onPress={() => setIsVerifyingPasskey(true)}
              testID={
                MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON
              }
              twClassName="mt-6"
            >
              {strings('money.security.verify_action')}
            </Button>
          </>
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
