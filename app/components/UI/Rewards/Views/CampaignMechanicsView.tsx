import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import ContentfulRichText, {
  isDocument,
} from '../components/ContentfulRichText/ContentfulRichText';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignMechanicsRouteParams = {
  CampaignMechanics: { campaignId: string };
};

export const CAMPAIGN_MECHANICS_TEST_IDS = {
  CONTAINER: 'campaign-mechanics-container',
  HOW_IT_WORKS_SECTION: 'campaign-mechanics-how-it-works',
  NOTES_SECTION: 'campaign-mechanics-notes',
} as const;

const CampaignMechanicsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CampaignMechanicsRouteParams, 'CampaignMechanics'>>();
  const { campaignId } = route.params;

  const { campaigns } = useRewardCampaigns();
  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const howItWorks = campaign?.details?.howItWorks ?? null;
  const notes = howItWorks?.notes ?? null;

  return (
    <ErrorBoundary navigation={navigation} view="CampaignMechanicsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_MECHANICS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.campaign_mechanics.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-mechanics-back-button' }}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {howItWorks && (
            <Box
              twClassName="px-4 py-4 border-b border-border-muted"
              testID={CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION}
            >
              <CampaignHowItWorks howItWorks={howItWorks} />
            </Box>
          )}

          {isDocument(notes) && (
            <Box
              twClassName="px-4 py-4"
              testID={CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION}
            >
              <ContentfulRichText document={notes} />
            </Box>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignMechanicsView;
