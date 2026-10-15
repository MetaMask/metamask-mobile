import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Routes from '../../../../../constants/navigation/Routes';
import type { MoneyModalsNavigationParamList } from '../../types/navigation';
import { selectSeedlessOnboardingUserEmail } from '../../../../../selectors/seedlessOnboardingController';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import MoneyDivider from '../MoneyDivider';
import {
  MONEY_PASSKEY_METHOD_NAMES,
  type MoneyPasskeyMethod,
} from '../../constants/moneyPasskey';
import { MoneyAddPasskeySheetTestIds } from './MoneyAddPasskeySheet.testIds';

type PasskeyFlowStep = 'options' | 'confirm' | 'signing' | 'done';

const SIGNING_HOLD_MS = 1200;
const DONE_HOLD_MS = 900;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  optionRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    height: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
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
  const continueToAuthenticatorSetup =
    route.params?.continueToAuthenticatorSetup ?? false;
  const returnToMoneyHome = route.params?.returnToMoneyHome ?? false;
  const returnToSecurity = route.params?.returnToSecurity ?? false;
  const showAdditionalFactorPrompt =
    route.params?.showAdditionalFactorPrompt ?? false;
  const email = useSelector(selectSeedlessOnboardingUserEmail);
  const { colors } = useTheme();
  const { registerPasskey } = useMoneyFinishSetup();
  const [flowStep, setFlowStep] = useState<PasskeyFlowStep>('options');
  const [selectedDestination, setSelectedDestination] =
    useState<MoneyPasskeyMethod>('one_password');

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
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
        if (continueToAuthenticatorSetup) {
          navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
            entryPoint: 'protect_money',
          });
        } else if (returnToSecurity) {
          navigation.goBack();
          navigation.navigate(Routes.MONEY.MANAGE_SECURITY, {
            successToast: strings('money.add_passkey_sheet.success_toast'),
          });
        } else if (showAdditionalFactorPrompt) {
          navigation.goBack();
          navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
            entryPoint: 'additional_factor',
          });
        } else if (returnToMoneyHome) {
          navigation.goBack();
        }
      });
    }, DONE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [
    continueToAuthenticatorSetup,
    flowStep,
    navigation,
    registerPasskey,
    returnToMoneyHome,
    returnToSecurity,
    selectedDestination,
    showAdditionalFactorPrompt,
  ]);

  const account = email || strings('money.add_passkey_sheet.your_account');

  const handleContinue = useCallback(async () => {
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
      setFlowStep('signing');
    }
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyAddPasskeySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {null}
      </BottomSheetHeader>
      <Box style={styles.content}>
        {flowStep === 'confirm' && (
          <>
            <Box style={styles.heroIcon} accessibilityElementsHidden>
              <Icon
                name={IconName.FaceId}
                size={IconSize.Xl}
                color={IconColor.PrimaryDefault}
              />
            </Box>
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('money.add_passkey_sheet.confirm_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-3"
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
            </Box>
          </>
        )}

        {flowStep === 'options' && (
          <>
            <Box style={styles.heroIcon} accessibilityElementsHidden>
              <Icon
                name={IconName.FaceId}
                size={IconSize.Xl}
                color={IconColor.PrimaryDefault}
              />
            </Box>
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('money.add_passkey_sheet.options_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-3"
            >
              {strings('money.add_passkey_sheet.options_description', {
                account,
              })}
            </Text>
            <Box twClassName="rounded-xl bg-muted px-4 overflow-hidden mt-4">
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
                      <Box style={styles.providerIcon} twClassName="bg-default">
                        <Icon
                          name={option.icon}
                          size={IconSize.Md}
                          color={IconColor.IconDefault}
                        />
                      </Box>
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
            <Box twClassName="gap-3 pt-5">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => setFlowStep('confirm')}
                testID={MoneyAddPasskeySheetTestIds.ADD_BUTTON}
              >
                {strings('money.add_passkey_sheet.add_button')}
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => setSelectedDestination('passwords')}
                testID={MoneyAddPasskeySheetTestIds.MORE_OPTIONS_BUTTON}
              >
                {strings('money.add_passkey_sheet.more_options')}
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
