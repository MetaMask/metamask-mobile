import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignStatusInfo,
  CampaignStatusInfo,
} from '../components/CampaignTile/CampaignTile.utils';
import { useOptInToCampaign } from '../hooks/useOptInToCampaign';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignDetailsRouteParams = {
  CampaignDetails: { campaign: CampaignDto };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
  OPT_IN_BUTTON: 'campaign-details-opt-in-button',
  OPTED_IN_LABEL: 'campaign-details-opted-in-label',
} as const;

const CampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CampaignDetailsRouteParams, 'CampaignDetails'>>();
  const { campaign } = route.params;

  const statusInfo: CampaignStatusInfo = useMemo(
    () => getCampaignStatusInfo(campaign),
    [campaign],
  );

  const { optInToCampaign, isOptingIn, optInError, clearOptInError } =
    useOptInToCampaign();
  const { status: participantStatus, isLoading: isStatusLoading } =
    useGetCampaignParticipantStatus(campaign.id);

  const isOptedIn = participantStatus?.optedIn === true;
  const canOptIn = statusInfo.status === 'active' && !isOptedIn;

  const handleOptIn = async () => {
    clearOptInError();
    await optInToCampaign(campaign.id);
  };

  return (
    <ErrorBoundary navigation={navigation} view="CampaignDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_DETAILS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={campaign.name}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('p-4 gap-6')}
          showsVerticalScrollIndicator={false}
        >
          {/* Status */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Box twClassName="rounded-full bg-muted px-3 py-1">
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {statusInfo.statusLabel}
              </Text>
            </Box>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {statusInfo.statusDescription}
            </Text>
          </Box>

          {/* Campaign Name */}
          <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
            {campaign.name}
          </Text>

          {/* Date Range */}
          <Box twClassName="gap-2">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('rewards.campaign_details.start_date', {
                date: new Date(campaign.startDate).toLocaleDateString(),
              })}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('rewards.campaign_details.end_date', {
                date: new Date(campaign.endDate).toLocaleDateString(),
              })}
            </Text>
          </Box>

          {/* Opt-in Section */}
          {canOptIn && (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleOptIn}
              isDisabled={isOptingIn || isStatusLoading}
              isLoading={isOptingIn}
              testID={CAMPAIGN_DETAILS_TEST_IDS.OPT_IN_BUTTON}
            >
              {strings('rewards.campaign_details.opt_in')}
            </Button>
          )}

          {isOptedIn && (
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-success-default"
              testID={CAMPAIGN_DETAILS_TEST_IDS.OPTED_IN_LABEL}
            >
              {strings('rewards.campaign_details.opted_in')}
            </Text>
          )}

          {optInError && (
            <Text variant={TextVariant.BodySm} twClassName="text-error-default">
              {strings('rewards.campaign_details.opt_in_error')}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignDetailsView;
