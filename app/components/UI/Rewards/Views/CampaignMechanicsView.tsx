import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import {
  selectCampaignHowItWorks,
  selectCampaignNotes,
} from '../../../../reducers/rewards/selectors';
import type { OndoCampaignNoteItem } from '../../../../core/Engine/controllers/rewards-controller/types';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignMechanicsRouteParams = {
  CampaignMechanics: { campaignId: string };
};

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

  const howItWorks = useSelector(selectCampaignHowItWorks(campaignId));
  const notes = useSelector(selectCampaignNotes(campaignId));

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
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* How it works section */}
          {howItWorks && (
            <Box
              twClassName="border-b border-border-muted"
              testID={CAMPAIGN_MECHANICS_TEST_IDS.HOW_IT_WORKS_SECTION}
            >
              <CampaignHowItWorks howItWorks={howItWorks} />
            </Box>
          )}

          {/* Notes / eligibility section */}
          {notes && (
            <Box
              twClassName="p-4 gap-3"
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
                color={TextColor.Alternative}
                testID={CAMPAIGN_MECHANICS_TEST_IDS.NOTES_DESCRIPTION}
              >
                {notes.description}
              </Text>
              {notes.items.map((item: OndoCampaignNoteItem, index: number) => (
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
                    color={TextColor.Alternative}
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
