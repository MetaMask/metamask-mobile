import React, { useCallback, useMemo } from 'react';
import { Linking, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
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
import I18n, { strings } from '../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import Logger from '../../../../util/Logger';
import FeedPostAge from '../../../UI/SocialFeed/components/FeedPostAge';
import ProfileVerifiedBadge from '../../../UI/SocialFeed/components/ProfileVerifiedBadge';
import TraderAvatar from '../../../UI/SocialFeed/components/TraderAvatar';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { SocialPostDecisionViewSelectorsIDs } from './SocialPostDecisionView.testIds';
import {
  APPEALABLE_DECISION_KINDS,
  POST_DECISION_KINDS,
  PROFILE_DECISION_KINDS,
  REPORTER_DECISION_KINDS,
  type SocialDecisionKind,
} from './SocialPostDecisionView.types';

/** Matches `AvatarAccountSize.Lg`. */
const PREVIEW_AVATAR_SIZE = 40;
/** The footer never sits closer to the screen edge than the page gutter. */
const MIN_FOOTER_BOTTOM_PADDING = 16;
/** Stands in for the terms link while the subtitle is split around it. */
const TERMS_LINK_TOKEN = '\u0000terms-link\u0000';

/**
 * The approved title and subtitle of every outcome. The keys stay literal so
 * the locale checker can see them.
 */
const getDecisionCopy = (
  kind: SocialDecisionKind,
): { title: string; subtitle: string } => {
  const termsLink = TERMS_LINK_TOKEN;

  switch (kind) {
    case 'profile-hidden':
      return {
        title: strings('social_leaderboard.post_decision.profile_hidden.title'),
        subtitle: strings(
          'social_leaderboard.post_decision.profile_hidden.subtitle',
          { termsLink },
        ),
      };
    case 'report-post-removed':
      return {
        title: strings(
          'social_leaderboard.post_decision.report_post_removed.title',
        ),
        subtitle: strings(
          'social_leaderboard.post_decision.report_post_removed.subtitle',
          { termsLink },
        ),
      };
    case 'report-post-left-up':
      return {
        title: strings(
          'social_leaderboard.post_decision.report_post_left_up.title',
        ),
        subtitle: strings(
          'social_leaderboard.post_decision.report_post_left_up.subtitle',
          { termsLink },
        ),
      };
    case 'report-profile-hidden':
      return {
        title: strings(
          'social_leaderboard.post_decision.report_profile_hidden.title',
        ),
        subtitle: strings(
          'social_leaderboard.post_decision.report_profile_hidden.subtitle',
          { termsLink },
        ),
      };
    case 'report-profile-left-up':
      return {
        title: strings(
          'social_leaderboard.post_decision.report_profile_left_up.title',
        ),
        subtitle: strings(
          'social_leaderboard.post_decision.report_profile_left_up.subtitle',
          { termsLink },
        ),
      };
    case 'post-removed':
    default:
      return {
        title: strings('social_leaderboard.post_decision.post_removed.title'),
        subtitle: strings(
          'social_leaderboard.post_decision.post_removed.subtitle',
          { termsLink },
        ),
      };
  }
};

/** What happened to the reported post or profile, named in the Decision row. */
const getReporterOutcome = (kind: SocialDecisionKind): string => {
  switch (kind) {
    case 'report-post-removed':
      return strings('social_leaderboard.post_decision.outcome_removed');
    case 'report-profile-hidden':
      return strings('social_leaderboard.post_decision.outcome_hidden');
    default:
      return strings('social_leaderboard.post_decision.outcome_no_action');
  }
};

/** "Nov 17, 2026" in the app locale. */
const formatDecisionDate = (timestampMs: number): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestampMs));

interface KeyValueProps {
  label: string;
  value: string;
  testID: string;
  twClassName?: string;
}

const KeyValue: React.FC<KeyValueProps> = ({
  label,
  value,
  testID,
  twClassName,
}) => (
  <Box twClassName={twClassName ? `gap-0.5 ${twClassName}` : 'gap-0.5'}>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/**
 * Explains a moderation decision: the poster's removed post or hidden
 * profile, or the outcome of a post or profile the viewer reported. The poster
 * can appeal; a reporter's outcome ends with Done.
 * Opened from the matching notification deeplink.
 */
const SocialPostDecisionView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'SocialPostDecisionView'>>();
  const insets = useSafeAreaInsets();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const canGoBack = navigation.canGoBack();
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const {
    kind,
    handle,
    text,
    reason,
    postedAt,
    reportedAt,
    decidedAt,
    avatarUrl,
    profileId,
    verified,
  } = params;

  const isProfileDecision = PROFILE_DECISION_KINDS.includes(kind);
  const showsPost = POST_DECISION_KINDS.includes(kind);
  const isAppealable = APPEALABLE_DECISION_KINDS.includes(kind);
  const isReporterDecision = REPORTER_DECISION_KINDS.includes(kind);
  const reportDate =
    isReporterDecision && reportedAt !== undefined
      ? formatDecisionDate(reportedAt)
      : undefined;
  const decisionDate =
    isReporterDecision && decidedAt !== undefined
      ? formatDecisionDate(decidedAt)
      : undefined;

  const handleAppeal = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.POST_APPEAL, { kind, handle, reason });
  }, [navigation, kind, handle, reason]);

  const handleDone = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.NOTIFICATIONS.VIEW);
  }, [navigation]);

  const handleTermsPress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.TERMS_OF_USE_URL).catch(
      (error: Error) => {
        Logger.error(
          error,
          'SocialPostDecisionView: failed to open the terms of service',
        );
      },
    );
  }, []);

  const copy = useMemo(() => getDecisionCopy(kind), [kind]);
  const [subtitleBeforeLink, subtitleAfterLink] = useMemo(
    () => copy.subtitle.split(TERMS_LINK_TOKEN),
    [copy.subtitle],
  );

  const avatar = (
    <TraderAvatar
      imageUrl={avatarUrl}
      profileId={profileId ?? handle}
      size={PREVIEW_AVATAR_SIZE}
      testID={
        isProfileDecision
          ? SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW_AVATAR
          : SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_AVATAR
      }
    />
  );

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialPostDecisionViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title=""
        {...(canGoBack && {
          onBack: handleBack,
          backButtonProps: {
            testID: SocialPostDecisionViewSelectorsIDs.BACK_BUTTON,
          },
        })}
      />
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pt-4 pb-6 gap-6')}
        testID={SocialPostDecisionViewSelectorsIDs.SCROLL}
      >
        <Box gap={2}>
          <Text
            variant={TextVariant.HeadingLg}
            accessibilityRole="header"
            testID={SocialPostDecisionViewSelectorsIDs.TITLE}
          >
            {copy.title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={SocialPostDecisionViewSelectorsIDs.SUBTITLE}
          >
            {subtitleBeforeLink}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.PrimaryDefault}
              accessibilityRole="link"
              onPress={handleTermsPress}
              testID={SocialPostDecisionViewSelectorsIDs.TERMS_LINK}
            >
              {strings('social_leaderboard.post_decision.terms_link')}
            </Text>
            {subtitleAfterLink}
          </Text>
        </Box>

        {isProfileDecision ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="rounded-2xl bg-muted px-4 py-3"
            testID={SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW}
          >
            {avatar}
            <Box twClassName="flex-1 min-w-0">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                  twClassName="shrink min-w-0"
                  testID={
                    SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW_NAME
                  }
                >
                  {handle}
                </Text>
                {verified ? (
                  <ProfileVerifiedBadge
                    testID={
                      SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW_VERIFIED_BADGE
                    }
                  />
                ) : null}
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={
                  SocialPostDecisionViewSelectorsIDs.PROFILE_PREVIEW_USERNAME
                }
              >
                {`@${handle}`}
              </Text>
            </Box>
          </Box>
        ) : null}

        {showsPost ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            gap={2}
            twClassName="rounded-2xl bg-muted px-4 py-3"
            testID={SocialPostDecisionViewSelectorsIDs.POST_PREVIEW}
          >
            {avatar}
            <Box gap={2} twClassName="flex-1 min-w-0">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                  twClassName="shrink min-w-0"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Bold}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                    twClassName="shrink min-w-0"
                    testID={
                      SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_HANDLE
                    }
                  >
                    {handle}
                  </Text>
                  {verified ? (
                    <ProfileVerifiedBadge
                      testID={
                        SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_VERIFIED_BADGE
                      }
                    />
                  ) : null}
                </Box>
                {postedAt === undefined ? null : (
                  <FeedPostAge
                    timestampMs={postedAt}
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                    twClassName="shrink-0"
                    testID={SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_AGE}
                  />
                )}
              </Box>
              {text ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                  testID={SocialPostDecisionViewSelectorsIDs.POST_PREVIEW_TEXT}
                >
                  {text}
                </Text>
              ) : null}
            </Box>
          </Box>
        ) : null}

        <Box gap={4}>
          <Box flexDirection={BoxFlexDirection.Row} gap={4}>
            <KeyValue
              label={strings('social_leaderboard.post_decision.reason_label')}
              value={reason}
              testID={SocialPostDecisionViewSelectorsIDs.REASON_VALUE}
              twClassName="flex-1"
            />
            {reportDate ? (
              <KeyValue
                label={strings(
                  'social_leaderboard.post_decision.your_report_label',
                )}
                value={reportDate}
                testID={SocialPostDecisionViewSelectorsIDs.REPORT_VALUE}
                twClassName="flex-1"
              />
            ) : null}
          </Box>
          {decisionDate ? (
            <KeyValue
              label={strings('social_leaderboard.post_decision.decision_label')}
              value={strings(
                'social_leaderboard.post_decision.decision_value',
                {
                  outcome: getReporterOutcome(kind),
                  date: decisionDate,
                },
              )}
              testID={SocialPostDecisionViewSelectorsIDs.DECISION_VALUE}
            />
          ) : null}
          <Box
            flexDirection={BoxFlexDirection.Row}
            gap={2}
            testID={SocialPostDecisionViewSelectorsIDs.AI_DISCLOSURE}
          >
            <Icon
              name={IconName.Ai}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="flex-1"
            >
              {strings('social_leaderboard.post_decision.ai_disclosure')}
            </Text>
          </Box>
        </Box>
      </ScrollView>
      <Box
        twClassName="px-4 pt-4 bg-default"
        style={{
          paddingBottom: Math.max(insets.bottom, MIN_FOOTER_BOTTOM_PADDING),
        }}
      >
        {isAppealable ? (
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            onPress={handleAppeal}
            testID={SocialPostDecisionViewSelectorsIDs.APPEAL_BUTTON}
          >
            {strings('social_leaderboard.post_decision.appeal')}
          </Button>
        ) : (
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            onPress={handleDone}
            testID={SocialPostDecisionViewSelectorsIDs.DONE_BUTTON}
          >
            {strings('social_leaderboard.post_decision.done')}
          </Button>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default SocialPostDecisionView;
