import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, ScrollView } from 'react-native';
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

interface WhatsHappeningSourcesBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  articles: Article[];
}

const WhatsHappeningSourcesBottomSheet: React.FC<
  WhatsHappeningSourcesBottomSheetProps
> = ({ isVisible, onClose, articles }) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (!isVisible) {
      bottomSheetRef.current?.onCloseBottomSheet();
    }
  }, [isVisible]);

  const handleSourcePress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

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
