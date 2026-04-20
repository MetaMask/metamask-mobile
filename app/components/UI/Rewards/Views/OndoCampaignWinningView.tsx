import React, { useCallback, useMemo } from 'react';
import { Image, Linking, ScrollView, useWindowDimensions } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Skeleton,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import Routes from '../../../../constants/navigation/Routes';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useOndoCampaignWinnerCode } from '../hooks/useOndoCampaignWinnerCode';
import { strings } from '../../../../../locales/i18n';
import CopyableField from '../components/ReferralDetails/CopyableField';
import { formatOrdinalRank, formatPercentChange } from '../utils/formatUtils';
import { RewardsMetricsButtons } from '../utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import campaignWinningHero from '../../../../images/rewards/campaign_winning.png';

/** Hero height as a fraction of window height (matches prior fixed top-half layout). */
const HERO_HEIGHT_RATIO = 0.5;

const PRIZE_EMAIL = 'ondocampaign@consensys.net';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignWinningRouteParams = {
  [Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW]: {
    campaignId: string;
    campaignName: string;
  };
};

export const ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-campaign-winning-view-container',
} as const;

const OndoCampaignWinningView: React.FC = () => {
  const tw = useTailwind();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = windowHeight * HERO_HEIGHT_RATIO;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<
      RouteProp<
        OndoCampaignWinningRouteParams,
        typeof Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW
      >
    >();
  const { campaignId } = route.params;

  const { position, isLoading: positionLoading } =
    useGetOndoLeaderboardPosition(campaignId);

  const { code: referralCode, isLoading: referralCodeLoading } =
    useOndoCampaignWinnerCode();

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_winning',
    campaign_id: campaignId,
  });

  const onDismiss = () => navigation.goBack();

  const handleCopyReferralCode = useCallback(() => {
    if (referralCode) {
      Clipboard.setString(referralCode);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: RewardsMetricsButtons.COPY_REFERRAL_CODE,
          })
          .build(),
      );
    }
  }, [referralCode, trackEvent, createEventBuilder]);

  const handleOpenMail = useCallback(async () => {
    const baseSubject = strings('rewards.ondo_campaign_winning.mail_subject');
    const subject = referralCode
      ? `${baseSubject} - ${referralCode}`
      : baseSubject;
    const body = strings('rewards.ondo_campaign_winning.mail_body', {
      code: referralCode || '—',
    });
    const url = `mailto:${PRIZE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // no-op: device may not have a mail handler
    }
  }, [referralCode]);

  const rankDisplay = useMemo(() => {
    if (positionLoading && !position) {
      return null;
    }
    if (!position) {
      return '—';
    }
    return strings('rewards.ondo_campaign_winning.rank_label', {
      place: formatOrdinalRank(position.rank),
    });
  }, [position, positionLoading]);

  const rateDisplay = useMemo(() => {
    if (positionLoading && !position) {
      return null;
    }
    if (!position) {
      return '—';
    }
    return formatPercentChange(position.rateOfReturn);
  }, [position, positionLoading]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignWinningView">
      <SafeAreaView
        edges={['bottom']}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      >
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow pb-6 gap-2 items-center')}
          keyboardShouldPersistTaps="handled"
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="relative w-full overflow-hidden"
            style={{ height: heroHeight }}
          >
            <Image
              source={campaignWinningHero}
              style={tw.style('absolute inset-0 h-full w-full')}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <Box
              style={{ paddingTop: insets.top + 8 }}
              twClassName="absolute right-4 top-0 z-10"
            >
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Md}
                onPress={onDismiss}
                accessibilityLabel={strings(
                  'rewards.ondo_campaign_winning.close_a11y',
                )}
                twClassName="bg-default-muted rounded-full"
              />
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="w-full gap-2 items-center px-4"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('rewards.ondo_campaign_winning.you_won')}
            </Text>

            {rankDisplay !== null ? (
              <Text
                variant={TextVariant.HeadingMd}
                color={TextColor.SuccessDefault}
                twClassName="text-center"
              >
                {rankDisplay}
              </Text>
            ) : (
              <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />
            )}

            {rateDisplay !== null ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.SuccessDefault}
                twClassName="text-center -mt-2"
              >
                {rateDisplay}
              </Text>
            ) : (
              <Skeleton style={tw.style('h-6 w-28 rounded-lg -mt-2')} />
            )}

            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center px-8"
            >
              {strings('rewards.ondo_campaign_winning.email_instructions')}
            </Text>

            <Box twClassName="w-full max-w-md">
              <CopyableField
                label={strings('rewards.referral.referral_code')}
                value={referralCode}
                onCopy={handleCopyReferralCode}
                valueLoading={referralCodeLoading}
              />
            </Box>

            <Box twClassName="w-full max-w-md pt-2">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleOpenMail}
              >
                {strings('rewards.ondo_campaign_winning.open_mail')}
              </Button>
            </Box>

            <TextButton
              variant={TextVariant.ButtonLabelMd}
              onPress={onDismiss}
              twClassName="mt-1"
            >
              {strings('rewards.ondo_campaign_winning.skip_for_now')}
            </TextButton>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignWinningView;
