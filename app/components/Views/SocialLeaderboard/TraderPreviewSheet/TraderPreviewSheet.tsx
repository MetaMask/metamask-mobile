import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { clearPendingReferralCode } from '../../../../reducers/rewardsMoney';
import { useParams } from '../../../../util/navigation/navUtils';
import TraderAvatar from '../../../UI/SocialFeed/components/TraderAvatar';
import { SkeletonShell } from '../components/SkeletonShell';
import { PositionCardBody } from '../../../UI/SocialFeed/components/SocialFeedPositionCard';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import { useTraderProfile } from '../TraderProfileView/hooks/useTraderProfile';
import { traderProfileResponseToMySocialProfile } from '../MyProfileView/utils/traderProfileResponseToMySocialProfile';
import { formatJoinedLabel } from '../MyProfileView/utils/formatJoinedLabel';
import {
  buildPerformanceCells,
  type PerformanceCell,
  type PerformanceCellId,
} from '../MyProfileView/utils/overlayMyProfileLiveStats';
import { ensureSocialTermsAccepted } from '../terms/socialTermsAcceptance';
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

const CELL_LABEL_KEYS: Record<PerformanceCellId, string> = {
  pnl: 'social_leaderboard.my_profile.realized_pnl',
  unrealizedPnl: 'social_leaderboard.my_profile.unrealized_pnl',
  winRate: 'social_leaderboard.my_profile.win_rate',
  holdTime: 'social_leaderboard.my_profile.avg_hold_time',
  volume: 'social_leaderboard.my_profile.volume',
};

const TONE_CLASS: Record<PerformanceCell['tone'], string | undefined> = {
  default: undefined,
  success: 'text-success-default',
  error: 'text-error-default',
};

const chunkPairs = (cells: PerformanceCell[]): PerformanceCell[][] => {
  const rows: PerformanceCell[][] = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(cells.slice(index, index + 2));
  }
  return rows;
};

/**
 * The sheet sizes itself once, from its first layout, and later size changes
 * jump instead of animating. Placeholders therefore match the height of what
 * replaces them. A position card's height depends on the position, so a
 * position link waits up to this long for it before the sheet opens.
 */
export const POSITION_PREVIEW_WAIT_MS = 3000;

/** Body Sm line height, the meta row under the name. */
const META_ROW_HEIGHT_CLASS = 'h-[22px]';

const PositionCardSkeleton = () => {
  const tw = useTailwind();
  return (
    <View testID={TraderPreviewSheetSelectorsIDs.POSITION_CARD_SKELETON}>
      <SkeletonShell>
        <View style={tw.style('w-full h-56 rounded-2xl')} />
      </SkeletonShell>
    </View>
  );
};

/** Same height as the loaded header: a 56pt avatar row and the meta row. */
const HeaderSkeleton = () => {
  const tw = useTailwind();
  return (
    <View testID={TraderPreviewSheetSelectorsIDs.HEADER_SKELETON}>
      <SkeletonShell>
        <View style={tw.style('gap-4')}>
          <View style={tw.style('flex-row items-center gap-4')}>
            <View style={tw.style('w-14 h-14 rounded-full')} />
            <View style={tw.style('flex-1 gap-2')}>
              <View style={tw.style('w-36 h-5 rounded')} />
              <View style={tw.style('w-24 h-4 rounded')} />
            </View>
          </View>
          <View style={tw.style('w-48 rounded', META_ROW_HEIGHT_CLASS)} />
        </View>
      </SkeletonShell>
    </View>
  );
};

const PerformanceSection = ({
  cells,
  isLoading,
}: {
  cells: PerformanceCell[];
  isLoading: boolean;
}) => {
  const tw = useTailwind();
  // Realized P&L, win rate, hold time and volume: two rows once loaded.
  const rows = isLoading ? [0, 1] : chunkPairs(cells);
  return (
    <Box
      gap={3}
      twClassName="border-t border-muted pt-4"
      testID={
        isLoading
          ? TraderPreviewSheetSelectorsIDs.PERFORMANCE_SKELETON
          : TraderPreviewSheetSelectorsIDs.PERFORMANCE_SECTION
      }
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextAlternative}
      >
        {strings('social_leaderboard.my_profile.performance_30d')}
      </Text>
      {isLoading
        ? rows.map((row) => (
            <SkeletonShell key={`skeleton-${row}`}>
              <View style={tw.style('flex-row gap-4')}>
                {[0, 1].map((column) => (
                  <View key={column} style={tw.style('flex-1 gap-0.5')}>
                    <View style={tw.style('w-20 h-[22px] rounded')} />
                    <View style={tw.style('w-16 h-6 rounded')} />
                  </View>
                ))}
              </View>
            </SkeletonShell>
          ))
        : chunkPairs(cells).map((row) => (
            <Box
              key={row.map((cell) => cell.id).join('-')}
              flexDirection={BoxFlexDirection.Row}
              gap={4}
            >
              {row.map((cell) => (
                <Box key={cell.id} twClassName="flex-1 min-w-0 gap-0.5">
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                  >
                    {strings(CELL_LABEL_KEYS[cell.id])}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName={TONE_CLASS[cell.tone]}
                    numberOfLines={1}
                  >
                    {cell.value}
                  </Text>
                </Box>
              ))}
              {row.length === 1 ? <Box twClassName="flex-1" /> : null}
            </Box>
          ))}
    </Box>
  );
};

const ReferralCodeRow = ({ code }: { code: string | null }) => {
  const tw = useTailwind();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={3}
      twClassName="rounded-xl bg-muted px-4 py-3 mb-2"
      testID={
        code
          ? TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW
          : TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_SKELETON
      }
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('social_leaderboard.trader_preview.referral_code')}
      </Text>
      {code ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          testID={TraderPreviewSheetSelectorsIDs.REFERRAL_CODE}
        >
          {code}
        </Text>
      ) : (
        <SkeletonShell>
          <View style={tw.style('w-20 h-6 rounded')} />
        </SkeletonShell>
      )}
    </Box>
  );
};

/**
 * Opened over Home when someone who has not joined Social opens a trader
 * profile or position link. Shows the trader's public profile and 30d
 * performance. Joining starts Social onboarding, which opens the link when it
 * finishes. A pending Money referral code from the same link is offered here
 * instead of in its own sheet, and is registered after onboarding.
 */
const TraderPreviewSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const tw = useTailwind();
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
  // A position link leads with the position, so it shows no performance. A
  // private trader shares no trading figures. Unrealized P&L is left out to
  // keep the grid to two rows, so no positions are fetched for it.
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
  const isPrivate = profile?.shareTradingActivity === false;
  const performanceCells = useMemo(
    () =>
      isPositionLink || isPrivate
        ? []
        : buildPerformanceCells(liveProfile).filter(
            (cell) => cell.id !== 'unrealizedPnl',
          ),
    [isPositionLink, isPrivate, liveProfile],
  );
  const joinedLabel = formatJoinedLabel(profile?.joinedAt);

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
      ensureSocialTermsAccepted(navigation.navigate);
    });
  }, [
    dispatch,
    navigation,
    offeredReferralCode,
    referralOffer.pendingReferralCode,
  ]);

  const handleNotNow = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // Resolving the position also caches its trader's profile, so the sheet
  // opens with both and does not resize. Nothing shows over Home meanwhile.
  if (isWaitingForPosition) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={TraderPreviewSheetSelectorsIDs.CONTAINER}
    >
      <SocialFeedSurfaceProvider showMockedFields={false}>
        <ScrollView
          style={tw.style('flex-shrink')}
          contentContainerStyle={tw.style('px-4 pt-2 pb-2 gap-4')}
          bounces={false}
          showsVerticalScrollIndicator={false}
          testID={TraderPreviewSheetSelectorsIDs.SCROLL}
        >
          {profile ? (
            <Box gap={4}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={4}
              >
                <TraderAvatar
                  imageUrl={profile.imageUrl}
                  address={profile.linkedAccountAddress ?? undefined}
                  profileId={profile.profileId}
                  size={56}
                  recyclingKey={profile.profileId}
                  testID={TraderPreviewSheetSelectorsIDs.AVATAR}
                />
                <Box twClassName="flex-1 min-w-0">
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Bold}
                    numberOfLines={1}
                    testID={TraderPreviewSheetSelectorsIDs.DISPLAY_NAME}
                  >
                    {profile.displayName}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                    testID={TraderPreviewSheetSelectorsIDs.HANDLE}
                  >
                    @{profile.handle}
                  </Text>
                </Box>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
                twClassName="flex-wrap"
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  testID={TraderPreviewSheetSelectorsIDs.FOLLOWERS_COUNT}
                >
                  {profile.followerCount ?? 0}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {strings('social_leaderboard.my_profile.followers')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  ·
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  testID={TraderPreviewSheetSelectorsIDs.FOLLOWING_COUNT}
                >
                  {profile.followingCount ?? 0}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {strings('social_leaderboard.my_profile.following')}
                </Text>
                {joinedLabel ? (
                  <>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      ·
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                      testID={TraderPreviewSheetSelectorsIDs.JOINED}
                    >
                      {joinedLabel}
                    </Text>
                  </>
                ) : null}
              </Box>
            </Box>
          ) : (
            <HeaderSkeleton />
          )}

          {!isPositionLink && !profile ? (
            <PerformanceSection cells={[]} isLoading />
          ) : null}
          {performanceCells.length > 0 ? (
            <PerformanceSection cells={performanceCells} isLoading={false} />
          ) : null}

          {isPositionLink ? (
            <View testID={TraderPreviewSheetSelectorsIDs.POSITION_CARD}>
              {sharedPosition.feedItem ? (
                <PositionCardBody
                  item={sharedPosition.feedItem}
                  expanded
                  showCopyTrade={false}
                />
              ) : sharedPosition.isLoading ? (
                <PositionCardSkeleton />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SocialFeedSurfaceProvider>

      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4} gap={2}>
        {offeredReferralCode ? (
          <ReferralCodeRow code={offeredReferralCode} />
        ) : referralOffer.status === 'checking' ? (
          <ReferralCodeRow code={null} />
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={referralOffer.status === 'checking'}
          isDisabled={referralOffer.status === 'checking'}
          onPress={handleJoin}
          testID={TraderPreviewSheetSelectorsIDs.JOIN_BUTTON}
        >
          {strings('social_leaderboard.trader_preview.join')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleNotNow}
          testID={TraderPreviewSheetSelectorsIDs.NOT_NOW_BUTTON}
        >
          {strings('social_leaderboard.trader_preview.not_now')}
        </Button>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('social_leaderboard.trader_preview.terms_note')}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default TraderPreviewSheet;
