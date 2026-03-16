import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import CampaignLeaderboard from '../components/Campaigns/CampaignLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectCampaignUserLeaderboardEntry,
  selectCampaignParticipantCount,
} from '../../../../reducers/rewards/selectors';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignLeaderboardRouteParams = {
  CampaignLeaderboard: { campaignId: string };
};

export const CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-view-container',
  QUALIFYING_DEPOSITS_SECTION: 'campaign-leaderboard-view-deposits-section',
  QUALIFYING_DEPOSITS_LABEL: 'campaign-leaderboard-view-deposits-label',
  QUALIFYING_DEPOSITS_AMOUNT: 'campaign-leaderboard-view-deposits-amount',
  RANK_LABEL: 'campaign-leaderboard-view-rank-label',
  RANK_TOTAL: 'campaign-leaderboard-view-rank-total',
} as const;

function formatScore(score: string): string {
  const dollars = Math.floor(parseFloat(score));
  return '$' + dollars.toLocaleString('en-US');
}

const CampaignLeaderboardView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<CampaignLeaderboardRouteParams, 'CampaignLeaderboard'>
    >();
  const { campaignId } = route.params;

  const userEntry = useSelector(selectCampaignUserLeaderboardEntry(campaignId));
  const participantCount = useSelector(
    selectCampaignParticipantCount(campaignId),
  );

  const handleMechanicsPress = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGN_MECHANICS, { campaignId });
  }, [navigation, campaignId]);

  return (
    <ErrorBoundary navigation={navigation} view="CampaignLeaderboardView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.campaign_leaderboard.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          endButtonIconProps={[
            {
              iconName: IconName.Question,
              onPress: handleMechanicsPress,
              testID: 'campaign-leaderboard-view-mechanics-button',
            },
          ]}
          includesTopInset
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Qualifying Deposits section */}
          <Box
            twClassName="px-4 pt-4 pb-4"
            testID={
              CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_SECTION
            }
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              testID={
                CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_LABEL
              }
            >
              {strings('rewards.campaign_leaderboard.qualifying_deposits')}
            </Text>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.FlexEnd}
              justifyContent={BoxJustifyContent.SpaceBetween}
              twClassName="mt-1"
            >
              {/* User's total score */}
              <Text
                variant={TextVariant.DisplayMd}
                fontWeight={FontWeight.Bold}
                testID={
                  CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.QUALIFYING_DEPOSITS_AMOUNT
                }
              >
                {userEntry ? formatScore(userEntry.totalScore) : '—'}
              </Text>

              {/* Rank + "of N" */}
              {userEntry && (
                <Box
                  flexDirection={BoxFlexDirection.Column}
                  alignItems={BoxAlignItems.FlexEnd}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                  >
                    <Icon
                      name={IconName.TrendUp}
                      size={IconSize.Sm}
                      color={IconColor.IconDefault}
                    />
                    <Text
                      variant={TextVariant.BodyMdBold}
                      fontWeight={FontWeight.Bold}
                      testID={CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_LABEL}
                    >
                      #{userEntry.rank}
                    </Text>
                  </Box>
                  {participantCount != null && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.Alternative}
                      testID={CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.RANK_TOTAL}
                    >
                      {strings('rewards.campaign_leaderboard.rank_of_total', {
                        count: participantCount.toLocaleString('en-US'),
                      })}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* Full-width divider */}
          <View style={tw.style('h-px bg-border-muted')} />

          {/* Leaderboard list — reuses existing component without its internal header */}
          <CampaignLeaderboard
            campaignId={campaignId}
            showInternalHeader={false}
          />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignLeaderboardView;
