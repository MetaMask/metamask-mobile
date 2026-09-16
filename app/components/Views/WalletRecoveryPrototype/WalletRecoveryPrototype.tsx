import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  NativeModules,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
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
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import {
  setMoneySmsPhoneNumber,
  setOnboardingStepperStep,
} from '../../../actions/user';
import { selectOnboardingStepperProgress } from '../../../reducers/user/selectors';
import { STEPPER_IDS } from '../../UI/Money/hooks/useOnboardingStep';
import {
  getMoneyFinishSetupTaskIndex,
  withMoneyFinishSetupTaskComplete,
  type MoneyFinishSetupTaskId,
} from '../../UI/Money/constants/moneyFinishSetupTasks';
import { MONEY_PASSKEY_METHOD_CODES } from '../../UI/Money/constants/moneyPasskey';
import { MONEY_SMS_DEMO_PHONE_NUMBER } from '../../UI/Money/constants/moneySms';
import SocialLoginProviderButtons, {
  SocialLoginProviderIcon,
} from '../../UI/SocialLoginProviderButtons';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../component-library/components/Icons/Icon';
import { WalletRecoveryPrototypeTestIds } from './WalletRecoveryPrototype.testIds';
import { colors as importedColors } from '../../../styles/common';

type RecoveryStage =
  | 'welcome'
  | 'googlePicker'
  | 'loading'
  | 'verifyWallet'
  | 'password'
  | 'sms'
  | 'authenticator'
  | 'srp'
  | 'verifyMoney';

type VerificationPurpose = 'wallet' | 'money';
type PasskeyState = 'ready' | 'signing' | 'done';

interface WalletRecoveryPasskeyNativeModule {
  signIn: () => Promise<boolean>;
}

const walletRecoveryPasskeyModule =
  NativeModules.WalletRecoveryPasskeyModule as
    | WalletRecoveryPasskeyNativeModule
    | undefined;

const GOOGLE_EMAIL = 'alex.wallet@gmail.com';
const SIMULATE_SOCIAL_RECOVERY_PASSKEY = true;
const RECOVERED_MONEY_SETUP_TASKS: MoneyFinishSetupTaskId[] = [
  'add_money',
  'secure_money',
  'recovery_method',
];
const DEMO_PHRASE =
  'orient crumble vivid salt loyal fatigue youth hospital immense remind urban express';

const PASSKEY_COPY_KEYS: Record<
  PasskeyState,
  { title: string; description: string }
> = {
  ready: {
    title: 'wallet_recovery_prototype.passkey_ready_title',
    description: 'wallet_recovery_prototype.passkey_ready_description',
  },
  signing: {
    title: 'wallet_recovery_prototype.passkey_signing_title',
    description: 'wallet_recovery_prototype.passkey_signing_description',
  },
  done: {
    title: 'wallet_recovery_prototype.passkey_done_title',
    description: 'wallet_recovery_prototype.passkey_done_description',
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 4,
  },
  headerSide: {
    width: 88,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  centeredContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browserBar: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  accountCard: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRow: {
    minHeight: 48,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  phraseInput: {
    minHeight: 144,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  codeCell: {
    width: 46,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeEntry: {
    position: 'relative',
    marginTop: 16,
  },
  codeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
    zIndex: 1,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  moneySignInSheetContent: {
    paddingBottom: 0,
  },
  passkeyStatus: {
    minHeight: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyPasskeyStatus: {
    minHeight: 0,
  },
  recoveryDescription: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  verifiedBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface PrototypeHeaderProps {
  title?: string;
  onBack?: () => void;
  onRefresh?: () => void;
}

const PrototypeHeader = ({
  title,
  onBack,
  onRefresh,
}: PrototypeHeaderProps) => (
  <Box
    style={styles.header}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
  >
    <Box style={styles.headerSide} alignItems={BoxAlignItems.Start}>
      {onBack && (
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBack}
          accessibilityLabel={strings('wallet_recovery_prototype.back')}
          testID={WalletRecoveryPrototypeTestIds.BACK}
        />
      )}
    </Box>
    <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
      {title}
    </Text>
    <Box style={styles.headerSide} alignItems={BoxAlignItems.End}>
      {onRefresh && (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={onRefresh}
          testID={WalletRecoveryPrototypeTestIds.REFRESH}
          accessibilityLabel={strings('wallet_recovery_prototype.refresh')}
        >
          {strings('wallet_recovery_prototype.refresh')}
        </Button>
      )}
    </Box>
  </Box>
);

interface MethodRowProps {
  title: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

const MethodRow = ({
  title,
  description,
  icon,
  onPress,
  testID,
}: MethodRowProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    testID={testID}
  >
    <Box
      style={styles.methodRow}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
    >
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        {description ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
        ) : null}
      </Box>
    </Box>
  </Pressable>
);

interface CodeRecoveryScreenProps {
  title: string;
  description: string;
  code: string;
  onCodeChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

const CodeRecoveryScreen = ({
  title,
  description,
  code,
  onCodeChange,
  onBack,
  onContinue,
}: CodeRecoveryScreenProps) => {
  const { themeAppearance } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (code.length < 6) {
      hasSubmittedRef.current = false;
      return;
    }
    if (!hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      onContinue();
    }
  }, [code, onContinue]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleCodeChange = (value: string) => {
    onCodeChange(value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <Box style={styles.screen} twClassName="bg-default">
      <PrototypeHeader title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-4"
        >
          {description}
        </Text>
        <Pressable
          style={styles.codeEntry}
          onPress={() => inputRef.current?.focus()}
          accessible={false}
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
                testID={`${WalletRecoveryPrototypeTestIds.CODE_DIGIT_PREFIX}-${index}`}
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
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            keyboardAppearance={themeAppearance}
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            showSoftInputOnFocus
            caretHidden
            maxLength={6}
            style={styles.codeInput}
            testID={WalletRecoveryPrototypeTestIds.CODE_INPUT}
            accessibilityLabel={description}
          />
        </Pressable>
      </ScrollView>
    </Box>
  );
};

const WalletRecoveryPrototype = () => {
  const dispatch = useDispatch();
  const onboardingProgress = useSelector(selectOnboardingStepperProgress);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'WalletRecoveryPrototype'>>();
  const initialStage = route.params?.initialStage ?? 'googlePicker';
  const { colors, themeAppearance } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const safeAreaStyle = useMemo(
    () => [
      styles.safeArea,
      {
        backgroundColor:
          initialStage === 'verifyMoney'
            ? importedColors.transparent
            : colors.background.default,
      },
    ],
    [colors.background.default, initialStage],
  );
  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        color: colors.text.default,
        borderColor: colors.border.default,
        backgroundColor: colors.background.default,
      },
    ],
    [colors],
  );
  const phraseInputStyle = useMemo(
    () => [inputStyle, styles.phraseInput],
    [inputStyle],
  );
  const existingSheetRef = useRef<BottomSheetRef>(null);
  const passkeySheetRef = useRef<BottomSheetRef>(null);
  const hasRequestedNativeWalletPasskeyRef = useRef(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [stage, setStage] = useState<RecoveryStage>(initialStage);
  const [showExistingSheet, setShowExistingSheet] = useState(false);
  const [showPasskeySheet, setShowPasskeySheet] = useState(false);
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('ready');
  const [verificationPurpose, setVerificationPurpose] =
    useState<VerificationPurpose>(
      initialStage === 'verifyMoney' ? 'money' : 'wallet',
    );
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [phrase, setPhrase] = useState('');

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const goTo = useCallback(
    (nextStage: RecoveryStage) => {
      clearTimers();
      setShowExistingSheet(false);
      setShowPasskeySheet(false);
      setPasskeyState('ready');
      setPassword('');
      setCode('');
      setStage(nextStage);
    },
    [clearTimers],
  );

  const resetFlow = useCallback(() => {
    clearTimers();
    setStage(initialStage);
    setShowExistingSheet(false);
    setShowPasskeySheet(false);
    setPasskeyState('ready');
    setVerificationPurpose(initialStage === 'verifyMoney' ? 'money' : 'wallet');
    setPassword('');
    setCode('');
    setPhrase('');
    hasRequestedNativeWalletPasskeyRef.current = false;
  }, [clearTimers, initialStage]);

  const returnToExistingSheet = useCallback(() => {
    goTo('welcome');
    setShowExistingSheet(true);
  }, [goTo]);

  const startGoogleRecovery = useCallback(() => {
    existingSheetRef.current?.onCloseBottomSheet(() => {
      goTo('googlePicker');
    });
  }, [goTo]);

  const startSrpRecovery = useCallback(() => {
    existingSheetRef.current?.onCloseBottomSheet(() => {
      goTo('srp');
    });
  }, [goTo]);

  const selectGoogleAccount = useCallback(() => {
    hasRequestedNativeWalletPasskeyRef.current = false;
    goTo('loading');
    schedule(() => {
      setVerificationPurpose('wallet');
      setStage('verifyWallet');
    }, 500);
  }, [goTo, schedule]);

  const completeVerification = useCallback(() => {
    clearTimers();
    setShowPasskeySheet(false);
    setPasskeyState('ready');
    setPassword('');
    setCode('');
    const now = Date.now();
    const recoveredSetupBitmask = RECOVERED_MONEY_SETUP_TASKS.reduce(
      (bitmask, taskId) =>
        withMoneyFinishSetupTaskComplete(
          bitmask,
          getMoneyFinishSetupTaskIndex(taskId),
        ),
      onboardingProgress[STEPPER_IDS.MONEY_FINISH_SETUP] ?? 0,
    );
    const markMoneyAccountReady = () => {
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_FINISH_SETUP,
          recoveredSetupBitmask,
        ),
      );
      dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_PASSKEY_COUNT, 1));
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_PASSKEY_METHOD,
          MONEY_PASSKEY_METHOD_CODES.one_password,
        ),
      );
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_PASSKEY_CREATED_AT, now),
      );
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR, 1),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT,
          now,
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED,
          1,
        ),
      );
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 1),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_RECOVERY_VERIFICATION_PENDING,
          0,
        ),
      );
    };

    if (verificationPurpose === 'wallet') {
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_RECOVERY_SOCIAL_LOGIN_WALLET,
          1,
        ),
      );
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED, 0),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT,
          now,
        ),
      );
      dispatch(setMoneySmsPhoneNumber(MONEY_SMS_DEMO_PHONE_NUMBER));
      markMoneyAccountReady();
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
      return;
    }
    markMoneyAccountReady();
    navigation.goBack();
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Check,
      iconColor: colors.success.default,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings(
            'wallet_recovery_prototype.money_recovery_success_toast',
          ),
          isBold: true,
        },
      ],
    });
  }, [
    clearTimers,
    colors.success.default,
    dispatch,
    navigation,
    onboardingProgress,
    toastRef,
    verificationPurpose,
  ]);

  const requestNativeWalletPasskey = useCallback(async () => {
    if (SIMULATE_SOCIAL_RECOVERY_PASSKEY) {
      setShowPasskeySheet(true);
      return;
    }
    if (Platform.OS !== 'ios' || !walletRecoveryPasskeyModule) {
      setShowPasskeySheet(true);
      return;
    }

    try {
      await walletRecoveryPasskeyModule.signIn();
      completeVerification();
    } catch {
      // Dismissing the native prompt intentionally reveals the fallback methods.
    }
  }, [completeVerification]);

  useEffect(() => {
    if (stage === 'verifyWallet') {
      if (hasRequestedNativeWalletPasskeyRef.current) {
        return undefined;
      }
      hasRequestedNativeWalletPasskeyRef.current = true;
      requestNativeWalletPasskey().catch(() => undefined);
      return undefined;
    }
    if (stage !== 'verifyMoney') {
      return undefined;
    }

    const timers = timersRef.current;
    const timer = schedule(() => setShowPasskeySheet(true), 200);
    return () => {
      clearTimeout(timer);
      timers.delete(timer);
    };
  }, [requestNativeWalletPasskey, schedule, stage]);

  const usePasskey = useCallback(() => {
    clearTimers();
    setPasskeyState('signing');
    schedule(() => {
      setPasskeyState('done');
      schedule(completeVerification, 700);
    }, 700);
  }, [clearTimers, completeVerification, schedule]);

  const handlePasskeySheetClosed = useCallback(() => {
    clearTimers();
    setShowPasskeySheet(false);
    setPasskeyState('ready');
    if (verificationPurpose === 'money') {
      navigation.goBack();
    }
  }, [clearTimers, navigation, verificationPurpose]);

  const closePasskeySheet = useCallback(() => {
    clearTimers();
    passkeySheetRef.current?.onCloseBottomSheet(() => {
      handlePasskeySheetClosed();
    });
  }, [clearTimers, handlePasskeySheetClosed]);

  const openMethod = useCallback(
    (method: 'passkey' | 'password' | 'sms' | 'authenticator') => {
      clearTimers();
      setShowPasskeySheet(false);
      setPasskeyState('ready');
      setPassword('');
      setCode('');
      if (method === 'passkey') {
        if (verificationPurpose === 'wallet') {
          requestNativeWalletPasskey().catch(() => undefined);
        } else {
          setShowPasskeySheet(true);
        }
        return;
      }
      setStage(method);
    },
    [clearTimers, requestNativeWalletPasskey, verificationPurpose],
  );

  const backFromMethod = useCallback(() => {
    goTo(verificationPurpose === 'wallet' ? 'verifyWallet' : 'verifyMoney');
  }, [goTo, verificationPurpose]);

  const importPhrase = useCallback(() => {
    clearTimers();
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  }, [clearTimers, navigation]);

  const renderWelcome = () => (
    <Box style={styles.screen}>
      <PrototypeHeader onRefresh={resetFlow} />
      <Box style={styles.centeredContent}>
        <Box style={styles.brandMark} twClassName="bg-primary-muted">
          <Icon
            name={IconName.Wallet}
            size={IconSize.Xl}
            color={IconColor.PrimaryDefault}
          />
        </Box>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          twClassName="text-center mt-6"
        >
          {strings('wallet_recovery_prototype.welcome_title')}
        </Text>
        <Text
          variant={TextVariant.BodyLg}
          color={TextColor.TextAlternative}
          twClassName="text-center mt-3"
        >
          {strings('wallet_recovery_prototype.welcome_description')}
        </Text>
        <Box twClassName="w-full mt-10">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => setShowExistingSheet(true)}
            testID={WalletRecoveryPrototypeTestIds.EXISTING_WALLET}
          >
            {strings('onboarding.have_existing_wallet')}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderGooglePicker = () => (
    <Box style={styles.screen}>
      <PrototypeHeader
        title={strings('wallet_recovery_prototype.google_title')}
        onBack={navigation.goBack}
        onRefresh={resetFlow}
      />
      <Box style={styles.content}>
        <Box
          style={styles.browserBar}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={2}
          twClassName="bg-muted"
        >
          <Icon
            name={IconName.Lock}
            size={IconSize.Xs}
            color={IconColor.IconAlternative}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            accounts.google.com
          </Text>
        </Box>
        <Box alignItems={BoxAlignItems.Center} twClassName="mt-8">
          <SocialLoginProviderIcon provider="google" />
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            twClassName="mt-5"
          >
            {strings('wallet_recovery_prototype.choose_account')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
          >
            {strings('wallet_recovery_prototype.continue_to_metamask')}
          </Text>
        </Box>
        <Pressable
          style={styles.accountCard}
          onPress={selectGoogleAccount}
          accessibilityRole="button"
          accessibilityLabel={GOOGLE_EMAIL}
          testID={WalletRecoveryPrototypeTestIds.GOOGLE_ACCOUNT}
        >
          <Box
            style={styles.accountCard}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
            twClassName="bg-muted mt-8"
          >
            <Box style={styles.avatar} twClassName="bg-primary-muted">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                A
              </Text>
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                Alex
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {GOOGLE_EMAIL}
              </Text>
            </Box>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Pressable>
      </Box>
    </Box>
  );

  const renderLoading = () => (
    <Box style={styles.screen}>
      <PrototypeHeader
        onBack={() => goTo('googlePicker')}
        onRefresh={resetFlow}
      />
      <Box style={styles.centeredContent}>
        <ActivityIndicator size="large" color={colors.primary.default} />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Medium}
          twClassName="mt-6"
        >
          {strings('wallet_recovery_prototype.finding_wallet')}
        </Text>
      </Box>
    </Box>
  );

  const renderVerify = () => (
    <Box style={styles.screen} twClassName="bg-default">
      <PrototypeHeader
        title={strings('wallet_recovery_prototype.verify_header')}
        onBack={() => goTo('googlePicker')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="mt-4"
        >
          {strings('wallet_recovery_prototype.verify_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('wallet_recovery_prototype.verify_description')}
        </Text>
        <Box twClassName="mt-6 gap-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => openMethod('passkey')}
            testID={WalletRecoveryPrototypeTestIds.USE_PASSKEY}
          >
            {strings('wallet_recovery_prototype.use_passkey')}
          </Button>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
            twClassName="mt-3"
          >
            <Box twClassName="h-px flex-1 bg-border-muted" />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('wallet_recovery_prototype.or')}
            </Text>
            <Box twClassName="h-px flex-1 bg-border-muted" />
          </Box>
          <MethodRow
            title={strings('wallet_recovery_prototype.password')}
            icon={IconName.Lock}
            onPress={() => openMethod('password')}
            testID={WalletRecoveryPrototypeTestIds.USE_PASSWORD}
          />
          <MethodRow
            title={strings('wallet_recovery_prototype.sms_recovery')}
            icon={IconName.Mobile}
            onPress={() => openMethod('sms')}
            testID={WalletRecoveryPrototypeTestIds.USE_SMS}
          />
          <MethodRow
            title={strings('wallet_recovery_prototype.authenticator')}
            icon={IconName.QrCode}
            onPress={() => openMethod('authenticator')}
            testID={WalletRecoveryPrototypeTestIds.USE_AUTHENTICATOR}
          />
        </Box>
      </ScrollView>
    </Box>
  );

  const renderPassword = () => (
    <Box style={styles.screen} twClassName="bg-default">
      <PrototypeHeader
        title={strings('wallet_recovery_prototype.password')}
        onBack={backFromMethod}
      />
      <Box style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-4 mb-4"
        >
          {strings('wallet_recovery_prototype.enter_password_description')}
        </Text>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder={strings('wallet_recovery_prototype.password')}
          autoFocus
          inputProps={{
            secureTextEntry: true,
            autoCapitalize: 'none',
            keyboardAppearance: themeAppearance,
            testID: WalletRecoveryPrototypeTestIds.PASSWORD_INPUT,
            accessibilityLabel: strings('wallet_recovery_prototype.password'),
          }}
        />
      </Box>
      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!password}
          onPress={completeVerification}
          testID={WalletRecoveryPrototypeTestIds.CONTINUE}
        >
          {strings('wallet_recovery_prototype.continue')}
        </Button>
      </Box>
    </Box>
  );

  const renderSrp = () => (
    <Box style={styles.screen}>
      <PrototypeHeader
        title={strings('wallet_recovery_prototype.import_wallet')}
        onBack={returnToExistingSheet}
        onRefresh={resetFlow}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          twClassName="mt-5"
        >
          {strings('wallet_recovery_prototype.enter_phrase')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 mb-6"
        >
          {strings('wallet_recovery_prototype.enter_phrase_description')}
        </Text>
        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          style={phraseInputStyle}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={strings('wallet_recovery_prototype.phrase_placeholder')}
          placeholderTextColor={colors.text.muted}
          testID={WalletRecoveryPrototypeTestIds.SRP_INPUT}
          accessibilityLabel={strings(
            'wallet_recovery_prototype.secret_recovery_phrase',
          )}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mt-3"
        >
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={() => setPhrase(DEMO_PHRASE)}
            testID={WalletRecoveryPrototypeTestIds.PASTE_PHRASE}
          >
            {strings('wallet_recovery_prototype.paste_demo_phrase')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={() => setPhrase('')}
            testID={WalletRecoveryPrototypeTestIds.CLEAR_PHRASE}
          >
            {strings('wallet_recovery_prototype.clear_all')}
          </Button>
        </Box>
      </ScrollView>
      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!phrase.trim()}
          onPress={importPhrase}
          testID={WalletRecoveryPrototypeTestIds.CONTINUE}
        >
          {strings('wallet_recovery_prototype.continue')}
        </Button>
      </Box>
    </Box>
  );

  const renderStage = () => {
    switch (stage) {
      case 'googlePicker':
        return renderGooglePicker();
      case 'loading':
        return renderLoading();
      case 'verifyWallet':
        return renderVerify();
      case 'verifyMoney':
        return <Box style={styles.screen} />;
      case 'password':
        return renderPassword();
      case 'sms':
        return (
          <CodeRecoveryScreen
            title={strings('wallet_recovery_prototype.sms_recovery')}
            description={strings(
              'wallet_recovery_prototype.sms_code_description',
            )}
            code={code}
            onCodeChange={setCode}
            onBack={backFromMethod}
            onContinue={completeVerification}
          />
        );
      case 'authenticator':
        return (
          <CodeRecoveryScreen
            title={strings('wallet_recovery_prototype.authenticator')}
            description={strings(
              'wallet_recovery_prototype.authenticator_code_description',
            )}
            code={code}
            onCodeChange={setCode}
            onBack={backFromMethod}
            onContinue={completeVerification}
          />
        );
      case 'srp':
        return renderSrp();
      case 'welcome':
      default:
        return renderWelcome();
    }
  };

  return (
    <SafeAreaView
      style={safeAreaStyle}
      edges={['top', 'bottom']}
      testID={WalletRecoveryPrototypeTestIds.CONTAINER}
    >
      {renderStage()}

      {showExistingSheet && (
        <BottomSheet
          ref={existingSheetRef}
          goBack={() => setShowExistingSheet(false)}
          keyboardAvoidingViewEnabled={false}
          testID={WalletRecoveryPrototypeTestIds.EXISTING_SHEET}
        >
          <BottomSheetHeader
            onClose={() =>
              existingSheetRef.current?.onCloseBottomSheet(() =>
                setShowExistingSheet(false),
              )
            }
          >
            {strings('wallet_recovery_prototype.existing_wallet')}
          </BottomSheetHeader>
          <Box style={styles.sheetContent} twClassName="gap-3">
            <SocialLoginProviderButtons
              googleLabel={strings('wallet_recovery_prototype.continue_google')}
              appleLabel={strings('wallet_recovery_prototype.continue_apple')}
              telegramLabel={strings(
                'wallet_recovery_prototype.continue_telegram',
              )}
              onPressGoogle={startGoogleRecovery}
              onPressApple={() => undefined}
              onPressTelegram={() => undefined}
              googleTestID={WalletRecoveryPrototypeTestIds.GOOGLE}
              appleTestID={WalletRecoveryPrototypeTestIds.APPLE}
              telegramTestID={WalletRecoveryPrototypeTestIds.TELEGRAM}
            />
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={startSrpRecovery}
              testID={WalletRecoveryPrototypeTestIds.IMPORT_SRP}
            >
              {strings('wallet_recovery_prototype.import_using_srp')}
            </Button>
          </Box>
        </BottomSheet>
      )}

      {showPasskeySheet && (
        <BottomSheet
          ref={passkeySheetRef}
          goBack={handlePasskeySheetClosed}
          keyboardAvoidingViewEnabled={false}
          testID={WalletRecoveryPrototypeTestIds.PASSKEY_SHEET}
        >
          <BottomSheetHeader
            onClose={passkeyState === 'ready' ? closePasskeySheet : undefined}
          >
            {strings(
              verificationPurpose === 'money'
                ? 'wallet_recovery_prototype.recover_money_title'
                : 'wallet_recovery_prototype.passkey_sign_in_title',
            )}
          </BottomSheetHeader>
          <Box
            style={[
              styles.sheetContent,
              verificationPurpose === 'money' && styles.moneySignInSheetContent,
            ]}
          >
            <Box
              style={[
                styles.passkeyStatus,
                passkeyState === 'ready' && styles.readyPasskeyStatus,
              ]}
            >
              {passkeyState === 'signing' ? (
                <ActivityIndicator
                  size="large"
                  color={colors.primary.default}
                />
              ) : passkeyState === 'done' ? (
                <Box
                  style={styles.verifiedBadge}
                  twClassName="bg-success-muted"
                >
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Xl}
                    color={IconColor.SuccessDefault}
                  />
                </Box>
              ) : null}
              {passkeyState !== 'ready' && (
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Bold}
                  twClassName="mt-5 text-center"
                >
                  {strings(PASSKEY_COPY_KEYS[passkeyState].title)}
                </Text>
              )}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.recoveryDescription}
                twClassName={
                  passkeyState === 'ready' ? 'text-left' : 'mt-2 text-left'
                }
              >
                {verificationPurpose === 'wallet' && passkeyState === 'ready'
                  ? strings(
                      'wallet_recovery_prototype.passkey_sign_in_description',
                      { email: GOOGLE_EMAIL },
                    )
                  : strings(
                      verificationPurpose === 'money' &&
                        passkeyState === 'ready'
                        ? 'wallet_recovery_prototype.recover_money_description'
                        : PASSKEY_COPY_KEYS[passkeyState].description,
                    )}
                {verificationPurpose === 'money' &&
                  passkeyState === 'ready' && (
                    <Text color={TextColor.PrimaryDefault}>
                      {' '}
                      {strings('wallet_recovery_prototype.learn_more')}
                    </Text>
                  )}
              </Text>
            </Box>
            {passkeyState === 'ready' && (
              <Box twClassName="gap-3">
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={usePasskey}
                  testID={WalletRecoveryPrototypeTestIds.USE_PASSKEY}
                >
                  {strings(
                    verificationPurpose === 'wallet'
                      ? 'wallet_recovery_prototype.continue'
                      : 'wallet_recovery_prototype.use_passkey',
                  )}
                </Button>
                {verificationPurpose === 'wallet' && (
                  <Button
                    variant={ButtonVariant.Secondary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    onPress={closePasskeySheet}
                  >
                    {strings('wallet_recovery_prototype.other_options')}
                  </Button>
                )}
                {verificationPurpose === 'money' && (
                  <>
                    <Button
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Lg}
                      isFullWidth
                      onPress={() => openMethod('authenticator')}
                      testID={WalletRecoveryPrototypeTestIds.USE_AUTHENTICATOR}
                    >
                      {strings('wallet_recovery_prototype.use_authenticator')}
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
};

export default WalletRecoveryPrototype;
