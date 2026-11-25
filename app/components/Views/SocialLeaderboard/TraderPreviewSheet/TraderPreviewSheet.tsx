import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  FontWeight,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { clearPendingReferralCode } from '../../../../reducers/rewardsMoney';
import { useParams } from '../../../../util/navigation/navUtils';
import giftImage from '../../../../images/socialV1/gift.png';
import ProfileVerifiedBadge from '../../../UI/SocialFeed/components/ProfileVerifiedBadge';
import TraderAvatar from '../../../UI/SocialFeed/components/TraderAvatar';
import { PositionCardBody } from '../../../UI/SocialFeed/components/SocialFeedPositionCard';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import {
  EM_DASH,
  formatAbbreviatedCount,
  formatFollowerCountLabel,
  formatPercent,
} from '../../../UI/SocialFeed/utils/formatters';
import { InviteTermsLink } from '../../../UI/Rewards/components/InviteTermsLink';
import type { InviteTermsLink as InviteTermsLinkValue } from '../../../UI/Rewards/utils/inviteTermsLink';
import { useTraderProfile } from '../TraderProfileView/hooks/useTraderProfile';
import { traderProfileResponseToMySocialProfile } from '../MyProfileView/utils/traderProfileResponseToMySocialProfile';
import { ensureSocialTermsAccepted } from '../terms/socialTermsAcceptance';
import { useRequireSocialProfileOnboarding } from '../hooks/useRequireSocialProfileOnboarding';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
  startPendingSocialPreviewOnboarding,
} from './pendingSocialPreviewTarget';
import { useSocialPreviewReferralOffer } from './useSocialPreviewReferralOffer';
import { useSharedPositionPreview } from './useSharedPositionPreview';
import { TraderPreviewSheetSelectorsIDs } from './TraderPreviewSheet.testIds';

export interface TraderPreviewSheetParams {
  traderId: string;
  /** Set for a shared position link: the sheet shows its card. */
  positionId?: string;
}

/**
 * The sheet sizes itself once, from its first layout, and later size changes
 * jump instead of animating. Placeholders therefore match the height of what
 * replaces them. A position card's height depends on the position, so a
 * position link waits up to this long for it before the sheet opens.
 */
export const POSITION_PREVIEW_WAIT_MS = 3000;

/** Stand-in copy that sizes a placeholder like the text it replaces. */
const PLACEHOLDER_HANDLE = '@placeholder';
const PLACEHOLDER_VALUE = '00';

/**
 * Shimmer is the only animation here. It stops for Reduce Motion, and on a
 * low-end device that is offline or on a slow network. An unknown tier keeps
 * the default.
 */
const useShouldAnimateSkeletons = (): boolean => {
  const isReducedMotion = useReducedMotion();
  const networkTier = useNetworkTier();
  const [hardwareTier] = useState(() => getHardwareTier());
  const isConstrained =
    hardwareTier === 'LOW' &&
    (networkTier === 'NONE' || networkTier === 'SLOW_CELLULAR');
  return !isReducedMotion && !isConstrained;
};

const formatWinRate = (winRatePercent: number | null): string | null =>
  winRatePercent == null
    ? null
    : formatPercent(winRatePercent, { showSign: false, decimals: 0 });

const StatColumn = ({
  label,
  value,
  testID,
  isLoading,
  animate,
}: {
  label: string;
  value: string;
  testID: string;
  isLoading: boolean;
  animate: boolean;
}) => (
  <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 min-w-0 gap-0.5">
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {label}
    </Text>
    {isLoading ? (
      <Skeleton hideChildren autoPlay={animate} twClassName="rounded-md">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {PLACEHOLDER_VALUE}
        </Text>
      </Skeleton>
    ) : (
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        testID={testID}
      >
        {value}
      </Text>
    )}
  </Box>
);

/** Followers and win rate, for a profile link. A private trader shares no win rate. */
const StatsCard = ({
  followerCount,
  winRateLabel,
  showWinRate,
  isLoading,
  animate,
}: {
  followerCount: number;
  winRateLabel: string | null;
  showWinRate: boolean;
  isLoading: boolean;
  animate: boolean;
}) => {
  const followersLabel = strings('social_leaderboard.trader_profile.followers');
  const winRateTitle = strings('social_leaderboard.trader_profile.win_rate');
  const followersValue = formatAbbreviatedCount(followerCount);
  const winRateValue = winRateLabel ?? EM_DASH;
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      twClassName="w-full rounded-2xl border border-muted py-2"
      accessible={!isLoading}
      accessibilityLabel={
        isLoading
          ? undefined
          : [
              `${followersLabel} ${followersValue}`,
              showWinRate ? `${winRateTitle} ${winRateValue}` : null,
            ]
              .filter(Boolean)
              .join(', ')
      }
      testID={
        isLoading
          ? TraderPreviewSheetSelectorsIDs.STATS_SKELETON
          : TraderPreviewSheetSelectorsIDs.STATS_CARD
      }
    >
      <StatColumn
        label={followersLabel}
        value={followersValue}
        testID={TraderPreviewSheetSelectorsIDs.FOLLOWERS_COUNT}
        isLoading={isLoading}
        animate={animate}
      />
      {showWinRate ? (
        <>
          <Box twClassName="w-px self-stretch bg-border-muted" />
          <StatColumn
            label={winRateTitle}
            value={winRateValue}
            testID={TraderPreviewSheetSelectorsIDs.WIN_RATE}
            isLoading={isLoading}
            animate={animate}
          />
        </>
      ) : null}
    </Box>
  );
};

const ReferralRowContent = ({
  code,
  benefitTitle,
  termsLink,
}: {
  code: string;
  benefitTitle: string | null;
  termsLink: InviteTermsLinkValue | null;
}) => {
  const tw = useTailwind();
  return (
    <>
      <Image
        source={giftImage}
        style={tw.style('w-12 h-12')}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={TraderPreviewSheetSelectorsIDs.REFERRAL_CODE}
        >
          {strings('social_leaderboard.trader_preview.referral_code', {
            code,
          })}
        </Text>
        {benefitTitle || termsLink ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={TraderPreviewSheetSelectorsIDs.REFERRAL_BENEFIT}
          >
            {benefitTitle}
            {benefitTitle && termsLink ? ' ' : null}
            {termsLink ? (
              <InviteTermsLink
                link={termsLink}
                variant={TextVariant.BodySm}
                testID={TraderPreviewSheetSelectorsIDs.REFERRAL_TERMS_LINK}
              />
            ) : null}
          </Text>
        ) : null}
      </Box>
    </>
  );
};

const REFERRAL_ROW_CLASS =
  'w-full flex-row items-center gap-2 rounded-2xl border border-muted px-3 py-2';

/** The offered code, or a same-sized placeholder while it is checked. */
const ReferralCodeRow = ({
  code,
  benefitTitle,
  termsLink,
  animate,
}: {
  code: string | null;
  benefitTitle: string | null;
  termsLink: InviteTermsLinkValue | null;
  animate: boolean;
}) =>
  code ? (
    <Box
      twClassName={REFERRAL_ROW_CLASS}
      testID={TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW}
    >
      <ReferralRowContent
        code={code}
        benefitTitle={benefitTitle}
        termsLink={termsLink}
      />
    </Box>
  ) : (
    <Skeleton
      hideChildren
      autoPlay={animate}
      twClassName="w-full rounded-2xl"
      testID={TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_SKELETON}
    >
      <Box twClassName={REFERRAL_ROW_CLASS}>
        <ReferralRowContent
          code={PLACEHOLDER_VALUE}
          benefitTitle={PLACEHOLDER_HANDLE}
          termsLink={null}
        />
      </Box>
    </Skeleton>
  );

/**
 * Opened over Home when someone who has not joined Social opens a trader
 * profile or position link. Shows the trader's public profile: followers and
 * win rate for a profile link, the shared position for a position link.
 * Joining starts Social onboarding, which opens the link when it finishes. A
 * pending Money referral code from the same link is offered here instead of
 * in its own sheet, and is registered after onboarding.
 */
const TraderPreviewSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const tw = useTailwind();
  const animateSkeletons = useShouldAnimateSkeletons();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { traderId: linkTraderId, positionId } =
    useParams<TraderPreviewSheetParams>();
  const sharedPosition = useSharedPositionPreview(positionId, linkTraderId);
  // A position the link's trader doesn't own is shown under its real owner,
  // as the full profile would after onboarding.
  const traderId = sharedPosition.ownerTraderId ?? linkTraderId;

  const { profile: liveProfile } = useTraderProfile(traderId);
  const profile = useMemo(
    () =>
      liveProfile ? traderProfileResponseToMySocialProfile(liveProfile) : null,
    [liveProfile],
  );
  const isPositionLink = Boolean(positionId);
  const [isPositionWaitOver, setIsPositionWaitOver] = useState(false);
  const isWaitingForPosition =
    isPositionLink && sharedPosition.isLoading && !isPositionWaitOver;
  useEffect(() => {
    if (!isWaitingForPosition) {
      return undefined;
    }
    const timer = setTimeout(
      () => setIsPositionWaitOver(true),
      POSITION_PREVIEW_WAIT_MS,
    );
    return () => clearTimeout(timer);
  }, [isWaitingForPosition]);
  // A private trader shares no trading figures.
  const isPrivate = profile?.shareTradingActivity === false;
  const winRateLabel = isPrivate
    ? null
    : formatWinRate(profile?.winRatePercent ?? null);
  const statsLine = profile
    ? [
        formatFollowerCountLabel(profile.followerCount),
        winRateLabel
          ? strings('social_leaderboard.feed.trader_stats.win_rate', {
              winRate: winRateLabel,
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const referralOffer = useSocialPreviewReferralOffer();
  const isReferralOffered = referralOffer.status === 'offered';
  const offeredReferralCode = isReferralOffered
    ? referralOffer.pendingReferralCode
    : null;

  const trackReferralOffer = useCallback(
    (interactionType: 'viewed' | 'dismissed', referralCode: string) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
        )
          .addProperties({
            interaction_type: interactionType,
            referral_code: referralCode,
            entry_type: 'deeplink',
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const viewedReferralCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!offeredReferralCode || viewedReferralCodeRef.current) {
      return;
    }
    viewedReferralCodeRef.current = offeredReferralCode;
    trackReferralOffer('viewed', offeredReferralCode);
  }, [offeredReferralCode, trackReferralOffer]);

  // Whichever way the sheet closes without joining, the link is dropped and
  // its referral code is answered, so the standalone invite does not follow.
  const pendingReferralCodeRef = useRef(referralOffer.pendingReferralCode);
  pendingReferralCodeRef.current = referralOffer.pendingReferralCode;
  useEffect(
    () => () => {
      if (getPendingSocialPreviewTarget()?.stage !== 'previewing') {
        return;
      }
      setPendingSocialPreviewTarget(null);
      const referralCode = pendingReferralCodeRef.current;
      if (referralCode) {
        dispatch(clearPendingReferralCode(referralCode));
      }
      if (viewedReferralCodeRef.current) {
        trackReferralOffer('dismissed', viewedReferralCodeRef.current);
      }
    },
    [dispatch, trackReferralOffer],
  );

  const handleJoin = useCallback(() => {
    startPendingSocialPreviewOnboarding(offeredReferralCode ?? undefined);
    const referralCode = referralOffer.pendingReferralCode;
    if (referralCode) {
      dispatch(clearPendingReferralCode(referralCode));
    }
    sheetRef.current?.onCloseBottomSheet(() => {
      // Opens onboarding, or the terms alone for an existing profile.
      if (ensureSocialTermsAccepted(navigation.navigate)) {
        ensureSocialProfileOnboarding();
      }
    });
  }, [
    dispatch,
    ensureSocialProfileOnboarding,
    navigation,
    offeredReferralCode,
    referralOffer.pendingReferralCode,
  ]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // Resolving the position also caches its trader's profile, so the sheet
  // opens with both and does not resize. Nothing shows over Home meanwhile.
  if (isWaitingForPosition) {
    return null;
  }

  const isCheckingReferral = referralOffer.status === 'checking';

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={TraderPreviewSheetSelectorsIDs.CONTAINER}
    >
      <SocialFeedSurfaceProvider showMockedFields={false}>
        <ScrollView
          style={tw.style('flex-shrink')}
          contentContainerStyle={tw.style('px-4 py-5 gap-3 items-center')}
          bounces={false}
          showsVerticalScrollIndicator={false}
          testID={TraderPreviewSheetSelectorsIDs.SCROLL}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Start}
            twClassName="w-full"
          >
            {/* Mirrors the close button so the avatar stays centred. */}
            <Box twClassName="w-8 h-8" />
            {profile ? (
              <TraderAvatar
                imageUrl={profile.imageUrl}
                address={profile.linkedAccountAddress ?? undefined}
                profileId={profile.profileId}
                size={56}
                recyclingKey={profile.profileId}
                testID={TraderPreviewSheetSelectorsIDs.AVATAR}
              />
            ) : (
              <Skeleton
                autoPlay={animateSkeletons}
                twClassName="w-14 h-14 rounded-full"
                testID={TraderPreviewSheetSelectorsIDs.HEADER_SKELETON}
              />
            )}
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Md}
              onPress={handleClose}
              accessibilityLabel={strings('navigation.close')}
              testID={TraderPreviewSheetSelectorsIDs.CLOSE_BUTTON}
            />
          </Box>

          <Box alignItems={BoxAlignItems.Center} gap={1} twClassName="w-full">
            {profile ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
                twClassName="max-w-full"
              >
                <Text
                  variant={TextVariant.HeadingLg}
                  twClassName="text-center shrink"
                  numberOfLines={1}
                  accessibilityRole="header"
                  testID={TraderPreviewSheetSelectorsIDs.HANDLE}
                >
                  @{profile.handle}
                </Text>
                {profile.verified ? (
                  <ProfileVerifiedBadge
                    size={IconSize.Md}
                    testID={TraderPreviewSheetSelectorsIDs.VERIFIED_BADGE}
                  />
                ) : null}
              </Box>
            ) : (
              <Skeleton
                hideChildren
                autoPlay={animateSkeletons}
                twClassName="rounded-lg"
              >
                <Text variant={TextVariant.HeadingLg}>
                  {PLACEHOLDER_HANDLE}
                </Text>
              </Skeleton>
            )}
            {isPositionLink ? (
              statsLine ? (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                  testID={TraderPreviewSheetSelectorsIDs.STATS_LINE}
                >
                  {statsLine}
                </Text>
              ) : (
                <Skeleton
                  hideChildren
                  autoPlay={animateSkeletons}
                  twClassName="rounded-md"
                  testID={TraderPreviewSheetSelectorsIDs.STATS_LINE_SKELETON}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {PLACEHOLDER_HANDLE}
                  </Text>
                </Skeleton>
              )
            ) : null}
          </Box>

          {isPositionLink ? null : (
            <StatsCard
              followerCount={profile?.followerCount ?? 0}
              winRateLabel={winRateLabel}
              showWinRate={!isPrivate}
              isLoading={!profile}
              animate={animateSkeletons}
            />
          )}

          {isPositionLink ? (
            <View
              style={tw.style('w-full')}
              testID={TraderPreviewSheetSelectorsIDs.POSITION_CARD}
            >
              {sharedPosition.feedItem ? (
                <PositionCardBody
                  item={sharedPosition.feedItem}
                  expanded
                  showCopyTrade={false}
                />
              ) : sharedPosition.isLoading ? (
                <Skeleton
                  autoPlay={animateSkeletons}
                  twClassName="w-full h-56 rounded-2xl"
                  testID={TraderPreviewSheetSelectorsIDs.POSITION_CARD_SKELETON}
                />
              ) : null}
            </View>
          ) : null}

          {offeredReferralCode || isCheckingReferral ? (
            <ReferralCodeRow
              code={offeredReferralCode}
              benefitTitle={referralOffer.benefitTitle}
              termsLink={referralOffer.termsLink}
              animate={animateSkeletons}
            />
          ) : null}
        </ScrollView>
      </SocialFeedSurfaceProvider>

      <BottomSheetFooter
        twClassName="pb-4"
        primaryButtonProps={{
          children: strings('social_leaderboard.trader_preview.join'),
          size: ButtonSize.Lg,
          isLoading: isCheckingReferral,
          isDisabled: isCheckingReferral,
          onPress: handleJoin,
          testID: TraderPreviewSheetSelectorsIDs.JOIN_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default TraderPreviewSheet;
