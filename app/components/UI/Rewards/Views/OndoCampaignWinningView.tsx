import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Linking, ScrollView, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
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
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useOndoCampaignWinnerCode } from '../hooks/useOndoCampaignWinnerCode';
import { strings } from '../../../../../locales/i18n';
import CopyableField from '../components/ReferralDetails/CopyableField';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { formatOrdinalRank, formatPercentChange } from '../utils/formatUtils';
import { RewardsMetricsButtons } from '../utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import campaignWinningHero from '../../../../images/rewards/campaign_winning.png';

const PRIZE_EMAIL = 'ondocampaign@consensys.net';

const styles = StyleSheet.create({
  heroBox: { aspectRatio: 1 },
});

interface OndoCampaignWinningRouteParams {
  RewardsOndoCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
}

export const ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-campaign-winning-view-container',
} as const;

const OndoCampaignWinningView: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<ParamListBase, 'RewardsOndoCampaignWinning'>>();
  const { campaignId } = route.params as { campaignId: string };

  const {
    position,
    isLoading: positionLoading,
    hasError: positionError,
    hasFetched: positionFetched,
  } = useGetOndoLeaderboardPosition(campaignId);

  const {
    code: winningCode,
    isLoading: winningCodeLoading,
    hasFetched: winningCodeFetched,
    hasError: winningCodeError,
    retry: retryWinningCode,
  } = useOndoCampaignWinnerCode(campaignId);

  useEffect(() => {
    if (
      winningCodeFetched &&
      !winningCodeLoading &&
      !winningCodeError &&
      !winningCode
    ) {
      navigation.goBack();
    }
  }, [
    winningCodeFetched,
    winningCodeLoading,
    winningCodeError,
    winningCode,
    navigation,
  ]);

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_winning',
    campaign_id: campaignId,
  });

  const onDismiss = () => navigation.goBack();

  const handleCopyWinningCode = useCallback(() => {
    if (winningCode) {
      Clipboard.setString(winningCode);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: RewardsMetricsButtons.COPY_REFERRAL_CODE,
          })
          .build(),
      );
    }
  }, [winningCode, trackEvent, createEventBuilder]);

  const handleOpenMail = useCallback(async () => {
    const baseSubject = strings('rewards.ondo_campaign_winning.mail_subject');
    const subject = winningCode
      ? `${baseSubject} - ${winningCode}`
      : baseSubject;
    const body = strings('rewards.ondo_campaign_winning.mail_body', {
      code: winningCode || '—',
    });
    const url = `mailto:${PRIZE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // no-op: device may not have a mail handler
    }
  }, [winningCode]);

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
          contentContainerStyle={tw.style('grow pb-6 items-center')}
          keyboardShouldPersistTaps="handled"
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="relative w-full overflow-hidden"
            style={styles.heroBox}
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
            twClassName="w-full gap-6 items-center px-4"
          >
            <Text
              variant={TextVariant.HeadingMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('rewards.ondo_campaign_winning.you_won')}
            </Text>

            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="items-center gap-1 w-full px-4"
            >
              {positionFetched && positionError && !position ? (
                <RewardsErrorBanner
                  title={strings('rewards.ondo_campaign_winning.error_title')}
                  description={strings(
                    'rewards.ondo_campaign_winning.error_description',
                  )}
                />
              ) : (
                <>
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
                      twClassName="text-center"
                    >
                      {rateDisplay}
                    </Text>
                  ) : (
                    <Skeleton style={tw.style('h-6 w-28 rounded-lg')} />
                  )}
                </>
              )}
            </Box>

            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center px-10"
            >
              {strings('rewards.ondo_campaign_winning.email_instructions')}
            </Text>

            {winningCodeError && !winningCodeLoading && !winningCode ? (
              <Box twClassName="w-full max-w-md">
                <RewardsErrorBanner
                  title={strings('rewards.ondo_campaign_winning.error_title')}
                  description={strings(
                    'rewards.ondo_campaign_winning.error_description',
                  )}
                  onConfirm={retryWinningCode}
                  confirmButtonLabel={strings(
                    'rewards.ondo_campaign_winning.error_retry',
                  )}
                  onConfirmLoading={winningCodeLoading}
                />
              </Box>
            ) : (
              <>
                <Box twClassName="w-full max-w-md">
                  {winningCodeLoading && !winningCode ? (
                    <Skeleton style={tw.style('h-16 w-full rounded-lg')} />
                  ) : (
                    <CopyableField
                      label={strings(
                        'rewards.ondo_campaign_winning.winning_code',
                      )}
                      value={winningCode}
                      onCopy={handleCopyWinningCode}
                      valueLoading={winningCodeLoading}
                    />
                  )}
                </Box>

                <Box twClassName="w-full max-w-md">
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    onPress={handleOpenMail}
                  >
                    {strings('rewards.ondo_campaign_winning.open_mail')}
                  </Button>
                </Box>
              </>
            )}

            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              textProps={{ color: TextColor.TextDefault }}
              onPress={onDismiss}
            >
              {strings('rewards.ondo_campaign_winning.skip_for_now')}
            </Button>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignWinningView;
