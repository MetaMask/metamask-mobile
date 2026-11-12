import GradingBadge from './GradingBadge';
import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesCardDisplayTestIds } from '../../Collectibles.testIds';
import type { CollectiblesCard } from '../../types';
import { getCardValue } from '../../providers/pack-partner/utils/cards';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import InteractiveCard from '../InteractiveCard';
import RarityTag from '../RarityTag';
import CardInformation from './CardInformation';
import CardMetadataStats from './CardMetadataStats';
import { getCardTitle, getGradeLabel } from './cardLabels';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';

export interface CardDisplayProps {
  card: CollectiblesCard;
  owner?: string;
  isActive?: boolean;
  variant?: 'detail' | 'reveal' | 'info';
  onImageReady?: () => void;
  imageMaxWidth?: number;
  showMetadata?: boolean;
}

/** Interactive card, value and the available card metadata. */
const CardDisplay = ({
  card,
  owner,
  isActive = true,
  variant = 'detail',
  onImageReady,
  imageMaxWidth,
  showMetadata = true,
}: CardDisplayProps) => {
  const gradeLabel = getGradeLabel(card);
  const packName = card.packCode
    ? getCollectiblesPackArtwork(`pack_partner:${card.packCode}`).name
    : undefined;
  const value = getCardValue(card);
  const valueSource =
    card.listedPriceUsd !== undefined &&
    (card.insuredValue === undefined || card.listedPriceUsd > card.insuredValue)
      ? 'collectibles.card.asking_price'
      : 'collectibles.card.insured_value';
  const isReveal = variant === 'reveal';
  if (variant === 'info') {
    return <CardInformation card={card} owner={owner} />;
  }

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="w-full"
      testID={CollectiblesCardDisplayTestIds.CONTAINER}
    >
      <Box
        marginVertical={isReveal ? 2 : 3}
        twClassName="w-4/5 max-w-80"
        style={imageMaxWidth ? { maxWidth: imageMaxWidth } : undefined}
      >
        <InteractiveCard
          key={card.mint}
          frontImage={card.image}
          backImage={card.backImage}
          frontPreviewImage={card.mediumImage}
          backPreviewImage={card.mediumBackImage}
          name={getCardTitle(card)}
          isActive={isActive}
          onImageReady={onImageReady}
        />
      </Box>
      <Box
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName={`w-full ${showMetadata ? '' : 'opacity-0'}`}
        accessibilityElementsHidden={!showMetadata}
        importantForAccessibility={
          showMetadata ? 'auto' : 'no-hide-descendants'
        }
      >
        {!isReveal && packName && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID="collectibles-card-source-pack"
          >
            {packName}
          </Text>
        )}
        <Text
          variant={isReveal ? TextVariant.HeadingMd : TextVariant.HeadingLg}
          fontWeight={FontWeight.Medium}
          twClassName="text-center"
          testID={CollectiblesCardDisplayTestIds.NAME}
        >
          {getCardTitle(card)}
        </Text>
        {(gradeLabel || card.rarity) && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            {gradeLabel && (
              <GradingBadge
                label={gradeLabel}
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
        )}
      </Box>
      {!isReveal && showMetadata ? (
        <CardMetadataStats
          card={card}
          value={value}
          valueLabel={strings(valueSource)}
          valueTestID={CollectiblesCardDisplayTestIds.VALUE}
        />
      ) : (
        value !== undefined && (
          <Box
            alignItems={BoxAlignItems.Center}
            gap={2}
            flexDirection={
              isReveal ? BoxFlexDirection.Column : BoxFlexDirection.Row
            }
            justifyContent={BoxJustifyContent.Center}
            twClassName={`w-full ${showMetadata ? '' : 'opacity-0'}`}
            accessibilityElementsHidden={!showMetadata}
            importantForAccessibility={
              showMetadata ? 'auto' : 'no-hide-descendants'
            }
          >
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings(valueSource)}
            </Text>
            {/* A USD valuation, not a USDC amount the user can receive. */}
            <Text
              variant={isReveal ? TextVariant.DisplayMd : TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              testID={CollectiblesCardDisplayTestIds.VALUE}
            >
              {formatUsd(value)}
            </Text>
          </Box>
        )
      )}
    </Box>
  );
};

export default CardDisplay;
