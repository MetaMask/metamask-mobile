import GradingBadge from '../../components/CardDisplay/GradingBadge';
import React, { useCallback, useEffect, useState, type RefObject } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import InteractiveCard from '../../components/InteractiveCard';
import {
  getCardTitle,
  getGradeLabel,
} from '../../components/CardDisplay/cardLabels';
import PackReveal from '../../components/PackReveal';
import RarityTag from '../../components/RarityTag';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import {
  CollectiblesCardDisplayTestIds,
  CollectiblesRevealTestIds,
} from '../../Collectibles.testIds';
import type { CollectiblesCard } from '../../types';
import CardMetadataStats from '../../components/CardDisplay/CardMetadataStats';
import { formatPurchaseAmount } from '../../components/PackPurchaseSheet/packPurchaseAmounts';

interface CollectiblesRevealContentProps {
  card: CollectiblesCard;
  initiallyRevealed?: boolean;
  current?: number;
  total?: number;
  isActive: boolean;
  isRevealed: boolean;
  onRevealed: () => void;
  footer: React.ReactNode;
  details?: React.ReactNode;
  cardSourceRef?: RefObject<View | null>;
}

/** Replit PackOpeningReveal/PackRevealDetails layout, retaining its shared motion. */
const CollectiblesRevealContent = ({
  card,
  initiallyRevealed,
  current,
  total,
  isActive,
  isRevealed,
  onRevealed,
  footer,
  details,
  cardSourceRef,
}: CollectiblesRevealContentProps) => {
  const tw = useTailwind();
  const { height } = useWindowDimensions();
  const [imageReady, setImageReady] = useState(
    !card.image && !card.mediumImage,
  );
  const handleImageReady = useCallback(() => setImageReady(true), []);
  const grade = getGradeLabel(card);
  const pack = card.packCode
    ? getCollectiblesPackArtwork(`pack_partner:${card.packCode}`)
    : undefined;
  const sold = card.sale?.status === 'completed';
  useEffect(() => {
    const timeout = setTimeout(handleImageReady, 8000);
    return () => clearTimeout(timeout);
  }, [card.image, card.mediumImage, handleImageReady]);

  return (
    <PackReveal
      initiallyRevealed={initiallyRevealed}
      current={current}
      total={total}
      name={getCardTitle(card)}
      image={card.image}
      backImage={card.mediumBackImage ?? card.backImage}
      packCode={card.packCode}
      previewImage={card.mediumImage}
      year={card.year}
      gradingCompany={card.gradingCompany}
      grade={card.grade}
      rarity={card.rarity}
      isActive={isActive}
      isReady={imageReady}
      onRevealed={onRevealed}
    >
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('grow justify-center px-4 py-3 gap-4')}
        showsVerticalScrollIndicator={false}
        testID={CollectiblesRevealTestIds.REVEALED}
      >
        <Box twClassName="items-center justify-center flex-1 py-2">
          <Box
            ref={cardSourceRef}
            collapsable={false}
            style={{ width: Math.min(240, height * 0.29) }}
            testID={CollectiblesCardDisplayTestIds.CONTAINER}
          >
            <InteractiveCard
              presentation="reveal"
              soldLabel={sold ? strings('collectibles.batch.sold') : undefined}
              name={getCardTitle(card)}
              frontImage={card.image}
              backImage={card.backImage}
              frontPreviewImage={card.mediumImage}
              backPreviewImage={card.mediumBackImage}
              isActive={isActive && isRevealed}
              onImageReady={handleImageReady}
            />
          </Box>
        </Box>
        <Box twClassName="items-center" gap={2}>
          {pack?.name && (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {pack.name}
            </Text>
          )}
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-center"
            testID={CollectiblesCardDisplayTestIds.NAME}
          >
            {getCardTitle(card)}
          </Text>
          <Box twClassName="flex-row items-center justify-center gap-2">
            {grade && (
              <GradingBadge
                label={grade}
                testID={CollectiblesCardDisplayTestIds.GRADE}
              />
            )}
            {card.rarity && (
              <RarityTag
                rarity={card.rarity}
                testID={CollectiblesCardDisplayTestIds.RARITY}
              />
            )}
          </Box>
        </Box>
        <CardMetadataStats
          card={card}
          valuePosition="middle"
          valueTestID={CollectiblesCardDisplayTestIds.VALUE}
        />
        {!sold && details}
      </ScrollView>
      {isRevealed && (
        <SafeAreaView
          edges={{ bottom: 'maximum' }}
          style={tw.style('px-4 pt-2 pb-4 gap-3')}
        >
          {sold && card.sale && (
            <Box
              twClassName="items-center pb-1"
              testID="collectibles-card-sold"
            >
              <Text color={TextColor.TextAlternative}>
                {strings(
                  card.sale.automatic
                    ? 'collectibles.reveal.received_automatically'
                    : 'collectibles.reveal.received',
                )}
              </Text>
              <Text variant={TextVariant.HeadingMd}>
                {formatPurchaseAmount(BigInt(card.sale.amount))}
              </Text>
            </Box>
          )}
          {footer}
        </SafeAreaView>
      )}
    </PackReveal>
  );
};
export default CollectiblesRevealContent;
