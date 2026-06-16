import React, { useCallback, useEffect } from 'react';
import { Image, Linking, ScrollView, useWindowDimensions } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
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
  FontWeight,
} from '@metamask/design-system-react-native';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { strings } from '../../../../../locales/i18n';
import CopyableField from '../components/ReferralDetails/CopyableField';
import { RewardsMetricsButtons } from '../utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import campaignWinningHero from '../../../../images/rewards/campaign_winning.png';

const HERO_HEIGHT_RATIO = 0.5;

export interface CampaignWinningViewProps {
  testID: string;
  viewName: string;
  prizeEmail: string;
  campaignName: string;
  campaignId: string;
  analyticsPageType: string;
  winningCode: string | null;
  hasOutcomeLoaded: boolean;
  isLoading: boolean;
  rankDisplay: string | null;
  resultDisplay?: string | null;
  isRankLoading?: boolean;
  isResultLoading?: boolean;
  fallbackRoute?: {
    route: string;
    params?: object;
  };
}

const CampaignWinningView: React.FC<CampaignWinningViewProps> = ({
  testID,
  viewName,
  prizeEmail,
  campaignName,
  campaignId,
  analyticsPageType,
  winningCode,
  hasOutcomeLoaded,
  isLoading,
  rankDisplay,
  resultDisplay = null,
  isRankLoading = false,
  isResultLoading = false,
  fallbackRoute,
}) => {
  const tw = useTailwind();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = windowHeight * HERO_HEIGHT_RATIO;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  useTrackRewardsPageView({
    page_type: analyticsPageType,
    campaign_id: campaignId,
  });

  useEffect(() => {
    if (!isLoading && hasOutcomeLoaded && winningCode === null) {
      if (fallbackRoute) {
        navigation.navigate(fallbackRoute.route, fallbackRoute.params);
        return;
      }
      navigation.goBack();
    }
  }, [isLoading, hasOutcomeLoaded, winningCode, fallbackRoute, navigation]);

  const onDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyWinningCode = useCallback(() => {
    if (winningCode) {
      Clipboard.setString(winningCode);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
          .addProperties({
            button_type: RewardsMetricsButtons.COPY_WINNER_VERIFICATION_CODE,
          })
          .build(),
      );
    }
  }, [winningCode, trackEvent, createEventBuilder]);

  const handleOpenMail = useCallback(async () => {
    const baseSubject = strings('rewards.campaign_winning.mail_subject', {
      campaignName,
    });
    const subject = winningCode
      ? `${baseSubject} - ${winningCode}`
      : baseSubject;
    const body = strings('rewards.campaign_winning.mail_body', {
      code: winningCode || '—',
    });
    const url = `mailto:${prizeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // no-op: device may not have a mail handler
    }
  }, [winningCode, prizeEmail, campaignName]);

  return (
    <ErrorBoundary navigation={navigation} view={viewName}>
      <SafeAreaView
        edges={['bottom']}
        style={tw.style('flex-1 bg-default')}
        testID={testID}
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
                  'rewards.campaign_winning.close_a11y',
                )}
                twClassName="bg-default-muted rounded-full"
              />
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="w-full flex-1 gap-2 items-center px-4"
          >
            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="w-full flex-1 items-center justify-center gap-4 px-4"
            >
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {strings('rewards.campaign_winning.you_won')}
              </Text>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="items-center w-full"
              >
                {rankDisplay !== null ? (
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('text-[64px] leading-[72px]')}
                    twClassName="text-center"
                  >
                    {rankDisplay}
                  </Text>
                ) : isRankLoading ? (
                  <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />
                ) : null}

                {resultDisplay !== null ? (
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.SuccessDefault}
                    twClassName="text-center"
                  >
                    {resultDisplay}
                  </Text>
                ) : isResultLoading ? (
                  <Skeleton style={tw.style('h-6 w-28 rounded-lg')} />
                ) : null}
              </Box>

              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="text-center px-8"
              >
                {strings('rewards.campaign_winning.email_instructions', {
                  email: prizeEmail,
                })}
              </Text>
            </Box>

            <Box twClassName="w-full max-w-md">
              <CopyableField
                value={winningCode}
                valueLoading={isLoading}
                onCopy={handleCopyWinningCode}
              />
            </Box>

            <Box twClassName="w-full max-w-md pt-2">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleOpenMail}
              >
                {strings('rewards.campaign_winning.open_mail')}
              </Button>
            </Box>

            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              textProps={{ color: TextColor.TextDefault }}
              onPress={onDismiss}
            >
              {strings('rewards.campaign_winning.skip_for_now')}
            </Button>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignWinningView;
