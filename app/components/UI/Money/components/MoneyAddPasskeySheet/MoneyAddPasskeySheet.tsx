import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { authenticateAsync } from 'expo-local-authentication';
import { isEmulator } from 'react-native-device-info';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
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
import type { MoneyModalsNavigationParamList } from '../../types/navigation';
import { selectSeedlessOnboardingUserEmail } from '../../../../../selectors/seedlessOnboardingController';
import { useTheme } from '../../../../../util/theme';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import MoneyDivider from '../MoneyDivider';
import {
  MONEY_PASSKEY_METHOD_NAMES,
  type MoneyPasskeyMethod,
} from '../../constants/moneyPasskey';
import { MoneyAddPasskeySheetTestIds } from './MoneyAddPasskeySheet.testIds';

type PasskeyFlowStep =
  | 'verifyFace'
  | 'confirm'
  | 'options'
  | 'signing'
  | 'done';

const SIGNING_HOLD_MS = 1200;
const DONE_HOLD_MS = 900;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },
  centeredText: {
    textAlign: 'center',
  },
  verifySpinner: {
    marginTop: 16,
  },
  statusArea: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const OPTIONS: {
  id: MoneyPasskeyMethod;
  labelKey: string;
  icon: IconName;
}[] = [
  {
    id: 'one_password',
    labelKey: 'money.add_passkey_sheet.one_password',
    icon: IconName.SecurityKey,
  },
  {
    id: 'passwords',
    labelKey: 'money.add_passkey_sheet.passwords',
    icon: IconName.Key,
  },
  {
    id: 'icloud',
    labelKey: 'money.add_passkey_sheet.icloud',
    icon: IconName.Lock,
  },
];

const MoneyAddPasskeySheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<MoneyModalsNavigationParamList, 'MoneyAddPasskeySheet'>
    >();
  const returnToMoneyHome = route.params?.returnToMoneyHome ?? false;
  const email = useSelector(selectSeedlessOnboardingUserEmail);
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { registerPasskey } = useMoneyFinishSetup();
  const [flowStep, setFlowStep] = useState<PasskeyFlowStep>('verifyFace');
  const [selectedDestination, setSelectedDestination] =
    useState<MoneyPasskeyMethod>('one_password');

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Check,
      iconColor: colors.success.default,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('money.add_passkey_sheet.success_toast'),
          isBold: true,
        },
      ],
    });
  }, [colors.success.default, toastRef]);

  useEffect(() => {
    if (flowStep === 'verifyFace') {
      let isActive = true;
      const verifyFace = async () => {
        try {
          const isRunningOnEmulator = await isEmulator();
          if (!isRunningOnEmulator) {
            await authenticateAsync({
              promptMessage: strings(
                'money.add_passkey_sheet.system_face_id_prompt',
              ),
              cancelLabel: strings('money.passkey_details.cancel'),
              disableDeviceFallback: true,
            });
          }
        } catch {
          // The design prototype assumes verification succeeds.
        } finally {
          if (isActive) {
            setFlowStep('confirm');
          }
        }
      };
      verifyFace();
      return () => {
        isActive = false;
      };
    }

    if (flowStep === 'confirm' || flowStep === 'options') {
      return undefined;
    }

    if (flowStep === 'signing') {
      const timer = setTimeout(() => setFlowStep('done'), SIGNING_HOLD_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      registerPasskey(selectedDestination);
      sheetRef.current?.onCloseBottomSheet(() => {
        if (returnToMoneyHome) {
          navigation.goBack();
        }
        showSuccessToast();
      });
    }, DONE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [
    flowStep,
    navigation,
    registerPasskey,
    returnToMoneyHome,
    selectedDestination,
    showSuccessToast,
  ]);

  const account = email || strings('money.add_passkey_sheet.your_account');

  const handleContinue = useCallback(() => {
    setFlowStep('signing');
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddPasskeySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('money.add_passkey_sheet.sign_in')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        {flowStep === 'verifyFace' && (
          <Box style={styles.statusArea}>
            <ActivityIndicator
              size="small"
              color={colors.primary.default}
              style={styles.verifySpinner}
            />
          </Box>
        )}

        {flowStep === 'confirm' && (
          <>
            <Box
              twClassName="h-16 items-center justify-center mb-2"
              accessibilityElementsHidden
            >
              <Icon
                name={IconName.FaceId}
                size={IconSize.Xl}
                color={IconColor.PrimaryDefault}
              />
            </Box>
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
            >
              {strings('money.add_passkey_sheet.confirm_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.centeredText}
              twClassName="mt-2 px-2"
            >
              {strings('money.add_passkey_sheet.confirm_description', {
                account,
                method: MONEY_PASSKEY_METHOD_NAMES[selectedDestination],
              })}
            </Text>
            <Box twClassName="gap-3 pt-6">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleContinue}
                testID={MoneyAddPasskeySheetTestIds.ADD_BUTTON}
              >
                {strings('money.add_passkey_sheet.continue')}
              </Button>
              <Pressable
                onPress={() => setFlowStep('options')}
                accessibilityRole="button"
                testID={MoneyAddPasskeySheetTestIds.MORE_OPTIONS_BUTTON}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.PrimaryDefault}
                  style={styles.centeredText}
                  twClassName="py-2"
                >
                  {strings('money.add_passkey_sheet.more_options')}
                </Text>
              </Pressable>
            </Box>
          </>
        )}

        {flowStep === 'options' && (
          <>
            <Box twClassName="h-12 items-center justify-center">
              <Icon
                name={IconName.FaceId}
                size={IconSize.Lg}
                color={IconColor.PrimaryDefault}
              />
            </Box>
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
            >
              {strings('money.add_passkey_sheet.choose_method_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.centeredText}
              twClassName="mt-1"
            >
              {strings('money.add_passkey_sheet.choose_method_description', {
                account,
              })}
            </Text>
            <Box twClassName="rounded-xl bg-muted px-3 overflow-hidden mt-4">
              {OPTIONS.map((option, index) => {
                const selected = selectedDestination === option.id;
                return (
                  <React.Fragment key={option.id}>
                    <Pressable
                      style={styles.optionRow}
                      onPress={() => setSelectedDestination(option.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      testID={`${MoneyAddPasskeySheetTestIds.CONTAINER}-option-${option.id}`}
                    >
                      <Icon
                        name={option.icon}
                        size={IconSize.Md}
                        color={IconColor.IconAlternative}
                      />
                      <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                        {strings(option.labelKey)}
                      </Text>
                      {selected && (
                        <Icon
                          name={IconName.Check}
                          size={IconSize.Md}
                          color={IconColor.PrimaryDefault}
                        />
                      )}
                    </Pressable>
                    {index < OPTIONS.length - 1 && (
                      <MoneyDivider style={styles.optionDivider} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
            <Box twClassName="pt-5">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleContinue}
                testID={MoneyAddPasskeySheetTestIds.ADD_BUTTON}
              >
                {strings('money.add_passkey_sheet.continue')}
              </Button>
            </Box>
          </>
        )}

        {(flowStep === 'signing' || flowStep === 'done') && (
          <Box style={styles.statusArea}>
            {flowStep === 'signing' && (
              <>
                <ActivityIndicator
                  size="large"
                  color={colors.primary.default}
                />
                <Text variant={TextVariant.BodyMd} twClassName="mt-3">
                  {strings('money.add_passkey_sheet.signing_in')}
                </Text>
              </>
            )}
            {flowStep === 'done' && (
              <>
                <Box
                  style={[
                    styles.doneRing,
                    { borderColor: colors.primary.default },
                  ]}
                >
                  <Icon
                    name={IconName.CheckBold}
                    size={IconSize.Xl}
                    color={IconColor.PrimaryDefault}
                  />
                </Box>
                <Text variant={TextVariant.BodyMd} twClassName="mt-2">
                  {strings('money.add_passkey_sheet.done')}
                </Text>
              </>
            )}
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
};

export default MoneyAddPasskeySheet;
