import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import FileShare from 'react-native-share';
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
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ClipboardManager from '../../../../../core/ClipboardManager';
import referralShareHero from '../../../../../images/rewards/referral-share-hero.png';
import MoneyEarnings from '../../../Money/components/MoneyEarnings';

const CREATOR_REFERRAL_CODE = '8F3A21';
// Placeholder program values — configured by the backend in production.
const REFERRER_REVENUE_SHARE_RATE = '25%';
const REFERRED_USER_CASHBACK_RATE = '10%';
const REFERRED_USER_BENEFIT_DURATION = '12 months';
const buildReferralLink = (code: string) =>
  `https://link.metamask.io/rewards?referral=${code}`;
const IOS_SHEET_PUSH_DURATION = 350;

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
          primaryButtonProps={{
            children: 'Save QR code',
            onPress: () => {
              saveQrCode().catch(() => undefined);
            },
            size: ButtonSize.Lg,
            testID: 'save-referral-qr-code-button',
          }}
          secondaryButtonProps={{
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

const ClaimEarningsSheet = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { entering, exiting } = createSheetPushAnimations(1, windowWidth);

  useEffect(() => {
    if (visible) {
      setIsSubmitted(false);
    }
  }, [visible]);

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <BottomSheet ref={bottomSheetRef} onClose={onClose}>
        <Box twClassName="overflow-hidden">
          <Animated.View
            key={isSubmitted ? 'submitted' : 'claim'}
            entering={entering}
            exiting={exiting}
          >
            <BottomSheetHeader onClose={handleClose}>
              {isSubmitted ? 'Claim submitted' : 'Claim earnings'}
            </BottomSheetHeader>

            <Box twClassName="px-4 pb-4 gap-5">
              {isSubmitted ? (
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
              ) : (
                <>
                  <Box twClassName="items-center py-2 gap-1">
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      Available to claim
                    </Text>
                    <Text
                      variant={TextVariant.DisplayMd}
                      fontWeight={FontWeight.Bold}
                    >
                      $2,410.00
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      Paid in mUSD
                    </Text>
                  </Box>

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
              )}
            </Box>

            <BottomSheetFooter
              primaryButtonProps={{
                children: isSubmitted ? 'Done' : 'Continue',
                onPress: isSubmitted ? handleClose : () => setIsSubmitted(true),
                size: ButtonSize.Lg,
                testID: isSubmitted
                  ? 'close-referral-claim-button'
                  : 'confirm-referral-claim-button',
              }}
              twClassName="px-4"
            />
          </Animated.View>
        </Box>
      </BottomSheet>
    </Modal>
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
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  // Vanity codes are assigned via backend/support workflows; not user-editable.
  const referralCode = CREATOR_REFERRAL_CODE;
  const [claimSheetVisible, setClaimSheetVisible] = useState(false);
  const [payoutDetailsVisible, setPayoutDetailsVisible] = useState(false);
  const [earningsStatusInfo, setEarningsStatusInfo] =
    useState<EarningsStatus | null>(null);
  const showPerformance = mode === 'performance';

  const copyReferralCode = async () => {
    await ClipboardManager.setString(referralCode);
    setIsCodeCopied(true);
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
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('p-4 pb-8 gap-6')}
        showsVerticalScrollIndicator={false}
      >
        {!showPerformance ? (
          <>
            <Box twClassName="items-center px-4 pt-2 gap-3">
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
                      color: isCodeCopied
                        ? IconColor.SuccessDefault
                        : IconColor.IconAlternative,
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
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                >
                  Code performance
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  Last 30 days · Updated daily
                </Text>
              </Box>

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
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
              >
                Recent payout
              </Text>
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
      ) : (
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
      )}

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
    </Box>
  );
};

export default ReferralRevenueShareDashboard;
