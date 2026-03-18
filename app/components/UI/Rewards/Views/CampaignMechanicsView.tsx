import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { strings } from '../../../../../locales/i18n';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignMechanicsRouteParams = {
  CampaignMechanics: { campaignId: string };
};

interface CampaignNoteItem {
  title: string;
  description: string;
}

interface CampaignNotes {
  title: string;
  description: string;
  items: CampaignNoteItem[];
}

function parseCampaignNotes(notes: unknown): CampaignNotes | null {
  if (
    notes !== null &&
    typeof notes === 'object' &&
    !Array.isArray(notes) &&
    'title' in notes &&
    'description' in notes &&
    'items' in notes &&
    Array.isArray((notes as { items: unknown }).items)
  ) {
    return notes as CampaignNotes;
  }
  return null;
}

export const CAMPAIGN_MECHANICS_TEST_IDS = {
  CONTAINER: 'campaign-mechanics-container',
  HOW_IT_WORKS_SECTION: 'campaign-mechanics-how-it-works',
  NOTES_SECTION: 'campaign-mechanics-notes',
  NOTES_TITLE: 'campaign-mechanics-notes-title',
  NOTES_DESCRIPTION: 'campaign-mechanics-notes-description',
  NOTE_ITEM: 'campaign-mechanics-note-item',
  NOTE_ITEM_TITLE: 'campaign-mechanics-note-item-title',
  NOTE_ITEM_DESCRIPTION: 'campaign-mechanics-note-item-description',
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
  const notes = parseCampaignNotes(howItWorks?.notes);

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

          {notes && (
            <Box
              twClassName="px-4 py-4 gap-3"
              testID={CAMPAIGN_MECHANICS_TEST_IDS.NOTES_SECTION}
            >
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                testID={CAMPAIGN_MECHANICS_TEST_IDS.NOTES_TITLE}
              >
                {notes.title}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={CAMPAIGN_MECHANICS_TEST_IDS.NOTES_DESCRIPTION}
              >
                {notes.description}
              </Text>
              {notes.items.map((item, index) => (
                <Box
                  key={`note-item-${index}`}
                  twClassName="gap-1"
                  testID={`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM}-${index}`}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    testID={`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM_TITLE}-${index}`}
                  >
                    {item.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    testID={`${CAMPAIGN_MECHANICS_TEST_IDS.NOTE_ITEM_DESCRIPTION}-${index}`}
                  >
                    {item.description}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignMechanicsView;
