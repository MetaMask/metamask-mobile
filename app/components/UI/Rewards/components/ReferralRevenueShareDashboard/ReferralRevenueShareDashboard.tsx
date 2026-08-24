import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Image,
  Linking,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import FileShare from 'react-native-share';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonsAlignment,
  type BottomSheetRef,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Label,
  ListItemSelect,
  SectionHeader,
  Switch,
  Tag,
  TagSeverity,
  Text,
  TextButton,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useTheme } from '../../../../../util/theme';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as IconNameLegacy } from '../../../../../component-library/components/Icons/Icon';
import {
  TextColor as TextColorLegacy,
  TextVariant as TextVariantLegacy,
} from '../../../../../component-library/components/Texts/Text';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { strings } from '../../../../../../locales/i18n';
import referralShareHero from '../../../../../images/rewards/referral-share-hero.png';
import MoneyEarnings from '../../../Money/components/MoneyEarnings';

const CREATOR_REFERRAL_CODE = '8F3A21';
const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_INVITE_HEADER = "You're invited to earn double cashback";
const REFERRAL_INVITE_SHEET_HEADER = "You're invited";
const REFERRAL_INVITE_BODY =
  "Earn 2× cashback on Swaps and Perps trades for a limited time. Opening this link doesn't enroll you automatically.";
// Placeholder program values — configured by the backend in production.
const REFERRER_REVENUE_SHARE_RATE = '25%';
const REFERRED_USER_CASHBACK_RATE = '10%';
const REFERRED_USER_BENEFIT_DURATION = '12 months';
const buildReferralLink = (code: string) =>
  `https://link.metamask.io/rewards?referral=${code}`;
const IOS_SHEET_PUSH_DURATION = 350;
const HOME_TAB_TOAST_DELAY_MS = 350;

const navigateToHomeTab = (navigation: AppNavigationProp) => {
  navigation.navigate(Routes.HOME_TABS, {
    screen: Routes.WALLET.HOME,
    params: {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    },
  });
};

const navigateToRewardsTab = (navigation: AppNavigationProp) => {
  navigation.navigate(Routes.HOME_TABS, {
    screen: Routes.REWARDS_VIEW,
    params: {
      screen: Routes.REWARDS_DASHBOARD,
    },
  });
};

const createSheetPushAnimations = (direction: 1 | -1, width: number) => {
  const easing = Easing.bezier(0.32, 0.72, 0, 1);
  return {
    entering: new Keyframe({
      0: {
        transform: [{ translateX: direction === 1 ? width : -width * 0.3 }],
      },
      100: { transform: [{ translateX: 0 }], easing },
    }).duration(IOS_SHEET_PUSH_DURATION),
    exiting: new Keyframe({
      0: { transform: [{ translateX: 0 }] },
      100: {
        transform: [{ translateX: direction === 1 ? -width * 0.3 : width }],
        easing,
      },
    }).duration(IOS_SHEET_PUSH_DURATION),
  };
};

interface StatusRowProps {
  label: string;
  value: string;
  description?: string;
  colorClassName?: string;
  onLabelPress?: () => void;
}

const StatusRow = ({
  label,
  value,
  description,
  colorClassName,
  onLabelPress,
}: StatusRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName={colorClassName ? 'py-3 gap-3' : 'py-2.5'}
  >
    {colorClassName ? (
      <Box twClassName={`w-2 h-2 rounded-full ${colorClassName}`} />
    ) : null}
    <Box twClassName="flex-1">
      {onLabelPress ? (
        <Box twClassName="self-start">
          <Pressable
            onPress={onLabelPress}
            accessibilityRole="button"
            accessibilityLabel={`Learn about ${label.toLowerCase()} earnings`}
            hitSlop={8}
          >
            <Box twClassName="border-b border-dotted border-icon-alternative pb-0.5">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {label}
              </Text>
            </Box>
          </Pressable>
        </Box>
      ) : (
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
      )}
      {description ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {description}
        </Text>
      ) : null}
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {value}
    </Text>
  </Box>
);

type EarningsStatus = 'available' | 'pending';

const EarningsStatusInfoSheet = ({
  status,
  onClose,
}: {
  status: EarningsStatus | null;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const isAvailable = status === 'available';

  if (!status) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <BottomSheetHeader
          onClose={() => bottomSheetRef.current?.onCloseBottomSheet()}
        >
          {isAvailable ? 'Available earnings' : 'Pending earnings'}
        </BottomSheetHeader>
        <Box twClassName="px-4 pb-6 gap-3">
          <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
            {isAvailable ? '$2,410.00' : '$510.24'}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {isAvailable
              ? 'These earnings have completed eligibility checks and are ready to claim.'
              : 'These earnings are still being finalized. They will move to Available automatically when checks are complete.'}
          </Text>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

const PayoutDetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="py-3 gap-4"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName="flex-1 text-right"
    >
      {value}
    </Text>
  </Box>
);

const PayoutDetailsSheet = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const transactionId =
    '0x8a21d534f83b09e91c62abf6e12d4720f9d4c1095fd8407cc40ba4df352f7f3c';

  return (
    <Modal visible={visible} transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <BottomSheetHeader
          onClose={() => bottomSheetRef.current?.onCloseBottomSheet()}
        >
          Payout details
        </BottomSheetHeader>
        <Box twClassName="px-4 pb-4">
          <Box twClassName="items-center py-3 gap-1">
            <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
              $200.00
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              200.00 mUSD · Completed
            </Text>
          </Box>
          <Box twClassName="mt-3">
            <PayoutDetailRow label="Date" value="August 8, 2026 at 2:14 PM" />
            <PayoutDetailRow
              label="Destination"
              value="Account 1 · 0x71C…9A2F"
            />
            <PayoutDetailRow label="Asset" value="mUSD" />
            <PayoutDetailRow label="Network" value="Ethereum" />
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="py-2 gap-4"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                Transaction ID
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  0x8A21…7F3C
                </Text>
                <ButtonIcon
                  iconName={IconName.Copy}
                  size={ButtonIconSize.Sm}
                  iconProps={{ color: IconColor.IconAlternative }}
                  accessibilityLabel="Copy transaction ID"
                  onPress={() => ClipboardManager.setString(transactionId)}
                />
              </Box>
            </Box>
          </Box>
        </Box>
        <BottomSheetFooter
          primaryButtonProps={{
            children: 'View on explorer',
            onPress: () => {
              Linking.openURL(`https://etherscan.io/tx/${transactionId}`).catch(
                () => undefined,
              );
            },
            size: ButtonSize.Lg,
            testID: 'view-payout-on-explorer-button',
          }}
          twClassName="px-4"
        />
      </BottomSheet>
    </Modal>
  );
};

interface FunnelRowProps {
  label: string;
  value: string;
  description?: string;
  widthClassName: string;
  colorClassName: string;
}

const FunnelRow = ({
  label,
  value,
  description,
  widthClassName,
  colorClassName,
}: FunnelRowProps) => (
  <Box twClassName="gap-2">
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {value}
      </Text>
    </Box>
    <Box twClassName="h-1.5 rounded-full bg-muted overflow-hidden">
      <Box
        twClassName={`h-full rounded-full ${colorClassName} ${widthClassName}`}
      />
    </Box>
    {description ? (
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {description}
      </Text>
    ) : null}
  </Box>
);

const ReferralQrCodeSheet = ({
  visible,
  onClose,
  referralCode,
}: {
  visible: boolean;
  onClose: () => void;
  referralCode: string;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const qrCodeRef = useRef<{
    toDataURL: (callback: (data: string) => void) => void;
  } | null>(null);

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const getQrCodeDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      if (!qrCodeRef.current) {
        reject(new Error('QR code is not ready'));
        return;
      }
      qrCodeRef.current.toDataURL((data) =>
        resolve(`data:image/png;base64,${data}`),
      );
    });

  const saveQrCode = async () => {
    const url = await getQrCodeDataUrl();
    await FileShare.open({
      url,
      type: 'image/png',
      filename: `metamask-referral-${referralCode}`,
      saveToFiles: true,
      failOnCancel: false,
    });
  };

  const shareQrCode = async () => {
    const url = await getQrCodeDataUrl();
    await FileShare.open({
      url,
      type: 'image/png',
      filename: `metamask-referral-${referralCode}`,
      message: `Use my MetaMask referral code ${referralCode} to get cashback on eligible Perps and Swaps fees. I may receive compensation from your eligible activity. Terms apply. ${buildReferralLink(referralCode)}`,
      failOnCancel: false,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <BottomSheetHeader onClose={handleClose}>
          Your referral code
        </BottomSheetHeader>
        <Box twClassName="items-center px-4 pb-8 gap-3">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            Have someone scan this code with their camera to get started.
          </Text>
          <Box twClassName="rounded-2xl bg-white p-5 mt-3">
            <QRCode
              value={buildReferralLink(referralCode)}
              size={220}
              getRef={(ref) => {
                qrCodeRef.current = ref;
              }}
            />
          </Box>
        </Box>
        <BottomSheetFooter
          secondaryButtonProps={{
            children: 'Save QR code',
            onPress: () => {
              saveQrCode().catch(() => undefined);
            },
            size: ButtonSize.Lg,
            testID: 'save-referral-qr-code-button',
          }}
          primaryButtonProps={{
            children: 'Share',
            onPress: () => {
              shareQrCode().catch(() => undefined);
            },
            size: ButtonSize.Lg,
            testID: 'share-referral-qr-code-button',
          }}
          buttonsAlignment={ButtonsAlignment.Vertical}
          twClassName="px-4"
        />
      </BottomSheet>
    </Modal>
  );
};

const ClaimAmountHero = ({
  label,
  amount,
  caption,
}: {
  label: string;
  amount: string;
  caption: string;
}) => (
  <Box twClassName="items-center py-2 gap-1">
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
      {amount}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {caption}
    </Text>
  </Box>
);

type ClaimStep = 'eligibility' | 'review' | 'submitted';

const CLAIM_STEP_TITLE: Record<ClaimStep, string> = {
  eligibility: 'Claim earnings',
  review: 'Review claim',
  submitted: 'Claim submitted',
};

const CLAIM_REVIEW_DETAIL_ROWS: {
  label: string;
  value: string;
  tooltip?: { title: string; content: string };
}[] = [
  { label: 'Destination', value: 'Money Account' },
  { label: 'Gross', value: '$2,410.00' },
  {
    label: 'Withholding',
    value: '$0.00',
    tooltip: {
      title: 'Withholding',
      content:
        'Amounts held back from this payout before it is sent, such as tax withholding.',
    },
  },
  {
    label: 'Fee',
    value: '$0.00',
    tooltip: {
      title: 'Fee',
      content: 'A processing fee deducted from this claim.',
    },
  },
  { label: 'Network', value: 'Ethereum' },
  {
    label: 'Expected delivery',
    value: '1–2 business days',
    tooltip: {
      title: 'Expected delivery',
      content: 'Typical time for mUSD to arrive after you confirm this claim.',
    },
  },
];

const ClaimEarningsSheet = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [step, setStep] = useState<ClaimStep>('eligibility');
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [hasPushed, setHasPushed] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const { entering, exiting } = createSheetPushAnimations(
    navDirection,
    windowWidth,
  );

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('eligibility');
      setNavDirection(1);
      setHasPushed(false);
    }
  }

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  };

  const goToStep = (nextStep: ClaimStep, direction: 1 | -1) => {
    setNavDirection(direction);
    setHasPushed(true);
    setStep(nextStep);
  };

  const primaryButtonProps =
    step === 'submitted'
      ? {
          children: 'Done',
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: 'close-referral-claim-button',
        }
      : step === 'review'
        ? {
            children: 'Confirm claim',
            onPress: () => goToStep('submitted', 1),
            size: ButtonSize.Lg,
            testID: 'submit-referral-claim-button',
          }
        : {
            children: 'Continue',
            onPress: () => goToStep('review', 1),
            size: ButtonSize.Lg,
            testID: 'confirm-referral-claim-button',
          };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <Box twClassName="overflow-hidden">
          <Animated.View
            key={step}
            entering={hasPushed ? entering : undefined}
            exiting={hasPushed ? exiting : undefined}
          >
            <BottomSheetHeader
              onClose={handleClose}
              onBack={
                step === 'review'
                  ? () => goToStep('eligibility', -1)
                  : undefined
              }
              backButtonProps={
                step === 'review'
                  ? { testID: 'claim-review-back-button' }
                  : undefined
              }
              closeButtonProps={{ testID: 'close-claim-sheet-button' }}
            >
              {CLAIM_STEP_TITLE[step]}
            </BottomSheetHeader>

            <Box twClassName="px-4 pb-4 gap-5">
              {step === 'submitted' ? (
                <Box twClassName="items-center py-4 gap-3">
                  <Icon
                    name={IconName.Confirmation}
                    size={IconSize.Xl}
                    color={IconColor.SuccessDefault}
                  />
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Bold}
                  >
                    $2,410.00
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="text-center"
                  >
                    Your mUSD claim is being processed. You can follow its
                    status from Earnings.
                  </Text>
                </Box>
              ) : null}

              {step === 'eligibility' ? (
                <>
                  <ClaimAmountHero
                    label="Available to claim"
                    amount="$2,410.00"
                    caption="Paid in mUSD"
                  />

                  <Box twClassName="rounded-xl bg-section px-4">
                    <StatusRow
                      label="Eligibility"
                      value="Approved"
                      description="Required checks complete"
                      colorClassName="bg-success-default"
                    />
                  </Box>

                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    Your payout destination, any fee, and expected delivery time
                    will be shown before the claim is finalized.
                  </Text>
                </>
              ) : null}

              {step === 'review' ? (
                <>
                  <ClaimAmountHero
                    label="You'll receive"
                    amount="$2,410.00"
                    caption="Paid in mUSD"
                  />
                  <Box gap={3}>
                    {CLAIM_REVIEW_DETAIL_ROWS.map((row) => (
                      <KeyValueRow
                        key={row.label}
                        field={{
                          label: {
                            text: row.label,
                            variant: TextVariantLegacy.BodyMD,
                            color: TextColorLegacy.Alternative,
                          },
                          tooltip: row.tooltip
                            ? {
                                title: row.tooltip.title,
                                content: row.tooltip.content,
                                iconName: IconNameLegacy.Info,
                              }
                            : undefined,
                        }}
                        value={{
                          label: {
                            text: row.value,
                            variant: TextVariantLegacy.BodyMD,
                            color: TextColorLegacy.Default,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </>
              ) : null}
            </Box>

            <BottomSheetFooter
              primaryButtonProps={primaryButtonProps}
              twClassName="px-4"
            />
          </Animated.View>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

type PrototypeScenarioId =
  | 'onboarded-kol'
  | 'invited-new-user'
  | 'invited-existing-user'
  | 'ineligible-user';

interface PrototypeScenario {
  id: PrototypeScenarioId;
  title: string;
  description?: string;
  isAvailable: boolean;
}

const PROTOTYPE_SCENARIOS: PrototypeScenario[] = [
  {
    id: 'onboarded-kol',
    title: 'Onboarded KOL',
    description: 'An approved user that can share their code.',
    isAvailable: true,
  },
  {
    id: 'invited-new-user',
    title: 'Invited new user',
    description:
      'A new user opening an invite URL. This screen is visible as an onboarding step.',
    isAvailable: true,
  },
  {
    id: 'invited-existing-user',
    title: 'Invited existing user',
    description:
      'An existing user opening an invite URL. This sheet opens on top of the destination.',
    isAvailable: true,
  },
  {
    id: 'ineligible-user',
    title: 'Ineligible user',
    description: 'A user who cannot use this referral.',
    isAvailable: true,
  },
];

// Shared across every mounted ReferralRevenueShareDashboard instance (overview
// and performance screens are separate navigator routes/mounts), so the
// prototype toggle keeps its value as you navigate between them.
type ClaimingToggleListener = () => void;
let isClaimingEnabledStore = false;
const claimingToggleListeners = new Set<ClaimingToggleListener>();

const setClaimingEnabled = (value: boolean) => {
  isClaimingEnabledStore = value;
  claimingToggleListeners.forEach((listener) => listener());
};

const subscribeToClaimingEnabled = (listener: ClaimingToggleListener) => {
  claimingToggleListeners.add(listener);
  return () => claimingToggleListeners.delete(listener);
};

const useClaimingEnabled = () =>
  useSyncExternalStore(
    subscribeToClaimingEnabled,
    () => isClaimingEnabledStore,
  );

type InviteSheetListener = () => void;
let isInvitedExistingUserVisibleStore = false;
const invitedExistingUserListeners = new Set<InviteSheetListener>();

const setInvitedExistingUserVisible = (value: boolean) => {
  isInvitedExistingUserVisibleStore = value;
  invitedExistingUserListeners.forEach((listener) => listener());
};

const subscribeToInvitedExistingUserVisible = (
  listener: InviteSheetListener,
) => {
  invitedExistingUserListeners.add(listener);
  return () => invitedExistingUserListeners.delete(listener);
};

const useInvitedExistingUserVisible = () =>
  useSyncExternalStore(
    subscribeToInvitedExistingUserVisible,
    () => isInvitedExistingUserVisibleStore,
  );

const PrototypeScenariosSheet = ({
  visible,
  selectedScenarioId,
  onSelectScenario,
  onClose,
}: {
  visible: boolean;
  selectedScenarioId: PrototypeScenarioId;
  onSelectScenario: (id: PrototypeScenarioId) => void;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { colors, brandColors } = useTheme();
  const isClaimingEnabled = useClaimingEnabled();

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <BottomSheetHeader
          onClose={() => bottomSheetRef.current?.onCloseBottomSheet()}
        >
          Prototype Scenarios
        </BottomSheetHeader>
        <Box twClassName="px-4 pb-6 gap-1">
          {PROTOTYPE_SCENARIOS.map((scenario) => (
            <React.Fragment key={scenario.id}>
              <ListItemSelect
                title={scenario.title}
                description={scenario.description}
                titleEndAccessory={
                  !scenario.isAvailable ? (
                    <Tag severity={TagSeverity.Neutral}>Coming soon</Tag>
                  ) : undefined
                }
                isSelected={scenario.id === selectedScenarioId}
                showSelectedIcon
                disabled={!scenario.isAvailable}
                onPress={() =>
                  scenario.isAvailable && onSelectScenario(scenario.id)
                }
                testID={`prototype-scenario-${scenario.id}`}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: scenario.id === selectedScenarioId,
                  disabled: !scenario.isAvailable,
                }}
              />
              {scenario.id === 'onboarded-kol' ? (
                <>
                  <Box twClassName="pl-4 pr-2 pt-3 pb-6">
                    <Switch
                      isOn={isClaimingEnabled}
                      onValueChange={setClaimingEnabled}
                      label="Enable Claiming"
                      trackColor={{
                        true: colors.primary.default,
                        false: colors.border.muted,
                      }}
                      thumbColor={brandColors.white}
                      ios_backgroundColor={colors.border.muted}
                      testID="enable-claiming-toggle"
                    />
                  </Box>
                  <Box twClassName="h-px bg-border-muted -mx-4 mb-1" />
                </>
              ) : null}
              {scenario.id === 'invited-existing-user' ? (
                <Box twClassName="h-px bg-border-muted -mx-4 mb-1" />
              ) : null}
            </React.Fragment>
          ))}
        </Box>
      </BottomSheet>
    </Modal>
  );
};

const ReferralInviteCodeField = ({
  referralCode,
  onChangeReferralCode,
  codeInputTestID,
}: {
  referralCode: string;
  onChangeReferralCode: (value: string) => void;
  codeInputTestID: string;
}) => {
  const inputRef = useRef<TextInput>(null);
  const codeAtEditStartRef = useRef(referralCode);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [hasEditedCode, setHasEditedCode] = useState(false);
  const [displayHeight, setDisplayHeight] = useState<number | undefined>();
  const isCompleteEditedCode =
    isEditingCode &&
    hasEditedCode &&
    referralCode.length === REFERRAL_CODE_LENGTH;

  useEffect(() => {
    if (isEditingCode) {
      inputRef.current?.focus();
    }
  }, [isEditingCode]);

  const handleBeginEditing = () => {
    codeAtEditStartRef.current = referralCode;
    setHasEditedCode(false);
    setIsEditingCode(true);
  };

  const handleChangeReferralCode = (value: string) => {
    setHasEditedCode(true);
    onChangeReferralCode(value.toUpperCase().slice(0, REFERRAL_CODE_LENGTH));
  };

  const handleCancelEditing = () => {
    onChangeReferralCode(codeAtEditStartRef.current);
    setHasEditedCode(false);
    setIsEditingCode(false);
  };

  const handleBlurReferralCode = () => {
    if (referralCode.length > 0) {
      return;
    }

    onChangeReferralCode(codeAtEditStartRef.current);
    setHasEditedCode(false);
    setIsEditingCode(false);
  };

  const handleDisplayLayout = (event: LayoutChangeEvent) => {
    if (isEditingCode) {
      return;
    }

    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setDisplayHeight((current) =>
      current === nextHeight ? current : nextHeight,
    );
  };

  return (
    <Box
      gap={1}
      twClassName="justify-start"
      onLayout={handleDisplayLayout}
      style={
        isEditingCode && displayHeight
          ? { minHeight: displayHeight }
          : undefined
      }
      testID="referral-invite-code-field"
    >
      {isEditingCode ? (
        <>
          <Label fontWeight={FontWeight.Medium}>Referral code</Label>
          <TextField
            value={referralCode}
            onChangeText={handleChangeReferralCode}
            onBlur={handleBlurReferralCode}
            inputRef={inputRef}
            endAccessory={
              isCompleteEditedCode ? (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.SuccessDefault}
                  testID="referral-code-complete-icon"
                  accessibilityLabel="Referral code complete"
                />
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  onPress={handleCancelEditing}
                  testID="cancel-referral-code-button"
                  accessibilityRole="button"
                >
                  Cancel
                </Text>
              )
            }
            inputProps={{
              autoCapitalize: 'characters',
              autoCorrect: false,
              autoComplete: 'off',
              maxLength: REFERRAL_CODE_LENGTH,
              accessibilityLabel: 'Referral code',
            }}
            testID={codeInputTestID}
          />
        </>
      ) : (
        <>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Referral code
          </Text>
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            testID={codeInputTestID}
          >
            {referralCode}
          </Text>
          <TextButton
            variant={TextVariant.BodySm}
            onPress={handleBeginEditing}
            testID="edit-referral-code-button"
            accessibilityRole="button"
          >
            Use a different code
          </TextButton>
        </>
      )}
    </Box>
  );
};

const ReferralInviteIllustration = () => {
  const tw = useTailwind();

  return (
    <Box alignItems={BoxAlignItems.Center} twClassName="pt-2">
      <Image
        source={referralShareHero}
        resizeMode="contain"
        style={tw.style('h-28 w-48')}
        accessibilityLabel="Referral invite illustration"
      />
    </Box>
  );
};

const ReferralInviteBody = ({
  referralCode,
  onChangeReferralCode,
  codeInputTestID,
  centered = false,
  showTitle = true,
}: {
  referralCode: string;
  onChangeReferralCode: (value: string) => void;
  codeInputTestID: string;
  centered?: boolean;
  showTitle?: boolean;
}) => (
  <>
    <ReferralInviteIllustration />
    {showTitle ? (
      <Box
        alignItems={centered ? BoxAlignItems.Center : undefined}
        twClassName="gap-y-2"
      >
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          twClassName={centered ? 'text-center' : undefined}
        >
          {REFERRAL_INVITE_HEADER}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName={centered ? 'text-center' : undefined}
        >
          {REFERRAL_INVITE_BODY}
        </Text>
      </Box>
    ) : (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName={centered ? 'text-center' : undefined}
      >
        {REFERRAL_INVITE_BODY}
      </Text>
    )}
    <ReferralInviteCodeField
      referralCode={referralCode}
      onChangeReferralCode={onChangeReferralCode}
      codeInputTestID={codeInputTestID}
    />
  </>
);

const ReferralInviteDisclosure = ({
  twClassName,
}: {
  twClassName?: string;
}) => (
  <Text
    variant={TextVariant.BodySm}
    color={TextColor.TextAlternative}
    twClassName={twClassName}
  >
    This is an affiliate relationship. The referrer may receive compensation
    from eligible Perps and Swaps fees.
  </Text>
);

const InvitedNewUserScreen = ({
  visible,
  onClose,
  onAccept,
}: {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}) => {
  const tw = useTailwind();
  const { width: windowWidth } = useWindowDimensions();
  const [referralCode, setReferralCode] = useState(CREATOR_REFERRAL_CODE);
  const [isContentVisible, setIsContentVisible] = useState(visible);
  const [isDismissing, setIsDismissing] = useState(false);
  const [exitsToLeft, setExitsToLeft] = useState(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const easing = Easing.bezier(0.32, 0.72, 0, 1);
  const entering = new Keyframe({
    0: { transform: [{ translateX: windowWidth }] },
    100: { transform: [{ translateX: 0 }], easing },
  }).duration(IOS_SHEET_PUSH_DURATION);
  const exiting = new Keyframe({
    0: { transform: [{ translateX: 0 }] },
    100: {
      transform: [{ translateX: exitsToLeft ? -windowWidth : windowWidth }],
      easing,
    },
  }).duration(IOS_SHEET_PUSH_DURATION);

  if (visible && !isContentVisible && !isDismissing) {
    setIsContentVisible(true);
  }

  useEffect(() => {
    if (!isDismissing) {
      return undefined;
    }

    setIsContentVisible(false);
    const timeout = setTimeout(() => {
      onCloseRef.current();
      setIsDismissing(false);
    }, IOS_SHEET_PUSH_DURATION);

    return () => clearTimeout(timeout);
  }, [isDismissing]);

  const dismiss = (toLeft: boolean) => {
    if (isDismissing) {
      return;
    }
    setExitsToLeft(toLeft);
    setIsDismissing(true);
  };

  if (!visible && !isContentVisible) {
    return null;
  }

  return (
    <Modal
      visible={visible || isDismissing}
      transparent
      animationType="none"
      onRequestClose={() => dismiss(false)}
      testID="invited-new-user-screen"
    >
      {isContentVisible ? (
        <Animated.View
          entering={entering}
          exiting={exiting}
          style={tw.style('flex-1 bg-default')}
        >
          <SafeAreaView
            edges={{ bottom: 'additive' }}
            style={tw.style('flex-1 bg-default')}
          >
            <HeaderStandard
              includesTopInset
              onBack={() => dismiss(false)}
              backButtonProps={{
                testID: 'invited-new-user-back-button',
              }}
            />
            <ScrollView
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style('px-4 gap-4')}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ReferralInviteBody
                referralCode={referralCode}
                onChangeReferralCode={setReferralCode}
                codeInputTestID="invited-new-user-referral-code-input"
              />
            </ScrollView>
            <Box twClassName="px-4">
              <ReferralInviteDisclosure twClassName="mb-4" />
              <Box twClassName="py-2">
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  twClassName="w-full"
                  onPress={() => {
                    onAccept();
                    dismiss(true);
                  }}
                  testID="accept-invited-new-user-button"
                >
                  Accept
                </Button>
              </Box>
              <Box alignItems={BoxAlignItems.Center} twClassName="py-4">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  onPress={() => dismiss(false)}
                  testID="decline-invited-new-user-button"
                  accessibilityRole="button"
                >
                  Decline
                </Text>
              </Box>
            </Box>
          </SafeAreaView>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const InvitedExistingUserSheet = ({
  visible,
  onClose,
  onAccept,
}: {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [referralCode, setReferralCode] = useState(CREATOR_REFERRAL_CODE);

  if (!visible) {
    return null;
  }

  const handleDecline = () => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  };

  const handleAccept = () => {
    bottomSheetRef.current?.onCloseBottomSheet(onAccept);
  };

  return (
    <Modal visible transparent animationType="none">
      <BottomSheet
        ref={bottomSheetRef}
        onClose={onClose}
        isInteractable={false}
        testID="invited-existing-user-sheet"
      >
        <BottomSheetHeader
          onClose={handleDecline}
          closeButtonProps={{
            testID: 'close-invited-existing-user-button',
          }}
        >
          {REFERRAL_INVITE_SHEET_HEADER}
        </BottomSheetHeader>
        <Box twClassName="px-4 gap-4">
          <ReferralInviteBody
            referralCode={referralCode}
            onChangeReferralCode={setReferralCode}
            codeInputTestID="invited-existing-user-referral-code-input"
            showTitle={false}
          />
          <ReferralInviteDisclosure />
        </Box>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          secondaryButtonProps={{
            children: 'Decline',
            onPress: handleDecline,
            size: ButtonSize.Lg,
            testID: 'decline-invited-existing-user-button',
          }}
          primaryButtonProps={{
            children: 'Accept',
            onPress: handleAccept,
            size: ButtonSize.Lg,
            testID: 'accept-invited-existing-user-button',
          }}
          twClassName="px-4 pt-4 pb-6"
        />
      </BottomSheet>
    </Modal>
  );
};

const PrototypeExistingUserInviteHost = () => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const visible = useInvitedExistingUserVisible();

  const close = () => setInvitedExistingUserVisible(false);

  return (
    <InvitedExistingUserSheet
      visible={visible}
      onClose={close}
      onAccept={() => {
        close();
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconNameLegacy.Confirmation,
          iconColor: colors.success.default,
          backgroundColor: 'transparent',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'Referral accepted',
              isBold: true,
            },
          ],
        });
      }}
    />
  );
};

const ReferralRevenueShareDashboard = ({
  mode = 'overview',
  onEarningsPress,
  isQrCodeVisible = false,
  onQrCodeClose,
}: {
  mode?: 'overview' | 'performance';
  onEarningsPress?: () => void;
  isQrCodeVisible?: boolean;
  onQrCodeClose?: () => void;
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  // Vanity codes are assigned via backend/support workflows; not user-editable.
  const referralCode = CREATOR_REFERRAL_CODE;
  const [claimSheetVisible, setClaimSheetVisible] = useState(false);
  const [payoutDetailsVisible, setPayoutDetailsVisible] = useState(false);
  const [earningsStatusInfo, setEarningsStatusInfo] =
    useState<EarningsStatus | null>(null);
  const showPerformance = mode === 'performance';
  const [isScenarioSheetVisible, setIsScenarioSheetVisible] =
    useState(!showPerformance);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<PrototypeScenarioId>('onboarded-kol');
  const [isInvitedNewUserVisible, setIsInvitedNewUserVisible] = useState(false);
  const isClaimingEnabled = useClaimingEnabled();
  const dashboardScrollRef = useRef<ScrollView>(null);

  const selectScenario = (id: PrototypeScenarioId) => {
    dashboardScrollRef.current?.scrollTo({ y: 0, animated: false });
    setSelectedScenarioId(id);
    setIsScenarioSheetVisible(false);
    setIsInvitedNewUserVisible(id === 'invited-new-user');
    setInvitedExistingUserVisible(id === 'invited-existing-user');
    if (id === 'invited-existing-user') {
      navigateToRewardsTab(navigation);
    }
    if (id === 'ineligible-user') {
      navigateToHomeTab(navigation);
      setTimeout(() => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconNameLegacy.Danger,
          iconColor: colors.warning.default,
          backgroundColor: 'transparent',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'Referral code ineligible',
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: 'This code is no longer active.',
          },
        });
      }, HOME_TAB_TOAST_DELAY_MS);
    }
  };

  const copyReferralCode = async () => {
    await ClipboardManager.setString(referralCode);
    setIsCodeCopied(true);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconNameLegacy.Confirmation,
      iconColor: colors.success.default,
      backgroundColor: 'transparent',
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('rewards.referral.referral_code_copied'),
          isBold: true,
        },
      ],
    });
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const shareReferral = async () => {
    const referralLink = buildReferralLink(referralCode);
    await Share.share({
      message: `Use my MetaMask code ${referralCode} to get cashback on eligible Perps and Swaps fees. I may receive compensation from your eligible activity. Terms apply.\n${referralLink}`,
      url: referralLink,
    });
  };

  return (
    <Box twClassName="flex-1">
      <ScrollView
        ref={dashboardScrollRef}
        testID="referral-dashboard-scroll"
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('p-4 pb-8 gap-6')}
        showsVerticalScrollIndicator={false}
      >
        {!showPerformance ? (
          <>
            <Box twClassName="items-center px-4 -mt-2 gap-3">
              <Image
                source={referralShareHero}
                resizeMode="contain"
                style={tw.style('h-28 w-48')}
                accessibilityLabel="Megaphone sharing a referral link and rewards"
              />
              <Text
                variant={TextVariant.DisplayMd}
                fontWeight={FontWeight.Bold}
                twClassName="text-center"
              >
                Share your code,{`\n`}earn rewards
              </Text>
            </Box>

            <Box twClassName="rounded-3xl bg-section border border-muted overflow-hidden">
              <Box twClassName="px-5 pt-5 pb-4 gap-2">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  Your referral code
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-2"
                >
                  <Text
                    variant={TextVariant.DisplayMd}
                    fontWeight={FontWeight.Bold}
                  >
                    {referralCode}
                  </Text>
                  <ButtonIcon
                    onPress={() => {
                      copyReferralCode().catch(() => undefined);
                    }}
                    accessibilityLabel={
                      isCodeCopied
                        ? 'Referral code copied'
                        : 'Copy referral code'
                    }
                    testID="copy-referral-code-button"
                    iconName={
                      isCodeCopied ? IconName.CopySuccess : IconName.Copy
                    }
                    size={ButtonIconSize.Sm}
                    iconProps={{
                      color: IconColor.IconAlternative,
                    }}
                  />
                </Box>
              </Box>

              <Box twClassName="h-px bg-border-muted" />

              <Box twClassName="px-5 py-5">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Start}
                >
                  <Box twClassName="flex-1 gap-1">
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      You earn
                    </Text>
                    <Text
                      variant={TextVariant.DisplayMd}
                      fontWeight={FontWeight.Bold}
                      color={TextColor.TextDefault}
                    >
                      {REFERRER_REVENUE_SHARE_RATE}
                    </Text>
                    <Text variant={TextVariant.BodySm}>of eligible fees</Text>
                  </Box>
                  <Box twClassName="w-px self-stretch bg-border-muted mx-5" />
                  <Box twClassName="flex-1 gap-1">
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      Referred users get
                    </Text>
                    <Text
                      variant={TextVariant.DisplayMd}
                      fontWeight={FontWeight.Bold}
                      color={TextColor.TextDefault}
                    >
                      {REFERRED_USER_CASHBACK_RATE}
                    </Text>
                    <Text variant={TextVariant.BodySm}>back on fees</Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="px-1 -mt-4 text-center"
            >
              {`Offer applies to eligible Perps and Swaps fees for ${REFERRED_USER_BENEFIT_DURATION}.`}
            </Text>

            <Box twClassName="h-px bg-border-muted -mx-4" />
            <Box twClassName="-mx-4 -mt-6">
              <MoneyEarnings
                last30DaysEarnings="$2,410.00"
                sinceInceptionEarnings="$510.24"
                primaryLabel="Available"
                secondaryLabel="Pending"
                onPress={onEarningsPress}
              />
              <Box alignItems={BoxAlignItems.Center} twClassName="mt-[48px]">
                <Button
                  variant={ButtonVariant.Secondary}
                  onPress={() => setIsScenarioSheetVisible(true)}
                  accessibilityLabel="Open prototype scenarios"
                  testID="open-prototype-scenarios-button"
                  twClassName="self-center"
                >
                  Prototype scenarios
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Box alignItems={BoxAlignItems.Start} twClassName="py-2 gap-1">
              <Text
                variant={TextVariant.DisplayLg}
                fontWeight={FontWeight.Bold}
              >
                $2,610.00
              </Text>
            </Box>

            <Box twClassName="px-1">
              <StatusRow
                label="Available"
                value="$2,410.00"
                onLabelPress={() => setEarningsStatusInfo('available')}
              />
              <StatusRow
                label="Pending"
                value="$510.24"
                onLabelPress={() => setEarningsStatusInfo('pending')}
              />
              <StatusRow label="Claimed" value="$200.00" />
            </Box>

            <Box twClassName="h-px bg-border-muted -mx-4" />

            <Box twClassName="px-1 gap-4">
              <SectionHeader title="Code performance" twClassName="px-0 py-0">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  Last 30 days • Updated daily
                </Text>
              </SectionHeader>

              <Box twClassName="gap-0.5">
                <Text
                  variant={TextVariant.DisplayMd}
                  fontWeight={FontWeight.Bold}
                >
                  $12.5K
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  Eligible fees
                </Text>
              </Box>

              <Box twClassName="gap-4">
                <FunnelRow
                  label="Code uses"
                  value="142"
                  description="Times your code or link was applied"
                  widthClassName="w-full"
                  colorClassName="bg-icon-default"
                />
                <FunnelRow
                  label="Confirmed referrals"
                  value="68"
                  description="Referred users who completed a first eligible action"
                  widthClassName="w-1/2"
                  colorClassName="bg-icon-default"
                />
                <FunnelRow
                  label="Active referees"
                  value="24"
                  description="Referred profiles with activity in the period"
                  widthClassName="w-1/4"
                  colorClassName="bg-icon-default"
                />
                <FunnelRow
                  label="Fee-generating referees"
                  value="18"
                  description="Referred profiles whose activity generated eligible fees"
                  widthClassName="w-1/6"
                  colorClassName="bg-icon-default"
                />
              </Box>

              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                Aggregated metrics protect wallet privacy. Individual wallets
                and activity are never shown.
              </Text>
            </Box>

            <Box twClassName="h-px bg-border-muted -mx-4" />

            <Box twClassName="px-1 gap-3">
              <SectionHeader title="Recent payout" twClassName="px-0 py-0" />
              <Pressable
                onPress={() => setPayoutDetailsVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="View August 8 payout details"
                testID="recent-payout-row"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName="py-1"
                >
                  <Box twClassName="gap-0.5">
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      August 8
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      200.00 mUSD
                    </Text>
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-2"
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      $200.00
                    </Text>
                  </Box>
                </Box>
              </Pressable>
            </Box>
          </>
        )}
      </ScrollView>

      {!showPerformance ? (
        <Box twClassName="px-4 pt-3 pb-5 border-t border-muted bg-default gap-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              shareReferral().catch(() => undefined);
            }}
            testID="referral-share-button"
          >
            Share referral link
          </Button>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center px-3"
          >
            Eligibility and rates are confirmed when activity occurs.
            Compensation disclosure required when sharing.
          </Text>
        </Box>
      ) : isClaimingEnabled ? (
        <Box twClassName="px-4 pt-3 pb-5 border-t border-muted bg-default">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => setClaimSheetVisible(true)}
            testID="referral-claim-button"
          >
            Claim $2,410.00
          </Button>
        </Box>
      ) : null}

      {isQrCodeVisible ? (
        <ReferralQrCodeSheet
          visible
          onClose={() => onQrCodeClose?.()}
          referralCode={referralCode}
        />
      ) : null}
      <ClaimEarningsSheet
        visible={claimSheetVisible}
        onClose={() => setClaimSheetVisible(false)}
      />
      <EarningsStatusInfoSheet
        status={earningsStatusInfo}
        onClose={() => setEarningsStatusInfo(null)}
      />
      <PayoutDetailsSheet
        visible={payoutDetailsVisible}
        onClose={() => setPayoutDetailsVisible(false)}
      />
      <PrototypeScenariosSheet
        visible={isScenarioSheetVisible}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={selectScenario}
        onClose={() => setIsScenarioSheetVisible(false)}
      />
      <InvitedNewUserScreen
        visible={isInvitedNewUserVisible}
        onClose={() => setIsInvitedNewUserVisible(false)}
        onAccept={() => navigateToHomeTab(navigation)}
      />
    </Box>
  );
};

// Exported for tests to reset the shared prototype toggle between cases.
export {
  setClaimingEnabled,
  setInvitedExistingUserVisible,
  PrototypeExistingUserInviteHost,
};
export default ReferralRevenueShareDashboard;
