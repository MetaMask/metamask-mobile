import React, { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Article } from '@metamask/ai-controllers';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../locales/i18n';
import ArticleRow from '../../../UI/MarketInsights/components/ArticleRow';
import { isSafeUrl } from '../../../UI/MarketInsights/utils/marketInsightsFormatting';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  WhatsHappeningInteractionType,
  type WhatsHappeningSourceValue,
} from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';

interface WhatsHappeningSourcesBottomSheetProps {
  onClose: () => void;
  articles: Article[];
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
}

const WhatsHappeningSourcesBottomSheet: React.FC<
  WhatsHappeningSourcesBottomSheetProps
> = ({ onClose, articles, item, cardIndex, source }) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleSourcePress = useCallback(
    (url: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_DETAILS_INTERACTED)
          .addProperties({
            ...getWhatsHappeningEventProps(item, cardIndex, source),
            interaction_type: WhatsHappeningInteractionType.SourceClick,
            article_url: url,
          })
          .build(),
      );
      if (isSafeUrl(url)) {
        Linking.openURL(url);
      }
    },
    [item, cardIndex, source, trackEvent, createEventBuilder],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('market_insights.sources_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView
        style={tw.style('px-4')}
        contentContainerStyle={tw.style('pb-12')}
        showsVerticalScrollIndicator={false}
      >
        {articles.map((article, index) => (
          <ArticleRow
            key={article.url}
            article={article}
            onPress={handleSourcePress}
            isLastItem={index === articles.length - 1}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default WhatsHappeningSourcesBottomSheet;
