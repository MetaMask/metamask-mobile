import React from 'react';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  BoxJustifyContent,
  Card,
  FontWeight,
  KeyValueRow,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import formatNumber from '../../../../../util/formatNumber';
import { GachaCardDisplayTestIds } from '../../Gacha.testIds';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import { getCardValue } from '../../providers/collector-crypt/utils/cards';
import InteractiveCard from '../InteractiveCard';
import { UsdcIcon } from '../UsdcAmount';
import {
  RARITY_TAG_SEVERITY,
  getGradeLabel,
  getRarityLabel,
} from './cardLabels';

export interface CardDisplayProps {
  card: CollectorCryptCard;
  owner?: string;
  isActive?: boolean;
  variant?: 'detail' | 'reveal';
  onImageReady?: () => void;
  imageMaxWidth?: number;
  showMetadata?: boolean;
}

interface CardDetailRow {
  label: string;
  value?: string;
  testID: string;
}

/** A quiet group of metadata rows, omitted when none of its values are known. */
const CardDetailSection = ({
  title,
  rows,
  testID,
}: {
  title: string;
  rows: CardDetailRow[];
  testID: string;
}) => {
  const visibleRows = rows.filter(({ value }) => value);
  if (!visibleRows.length) return null;

  return (
    <Box gap={3} twClassName="w-full" testID={testID}>
      <Text variant={TextVariant.HeadingSm}>{title}</Text>
      <Card twClassName="py-2">
        {visibleRows.map(({ label, value, testID: rowTestID }) => (
          <KeyValueRow
            key={rowTestID}
            keyLabel={label}
            value={value}
            twClassName="h-auto min-h-10 px-0 py-2"
            keyTextProps={{ fontWeight: FontWeight.Regular }}
            valueTextProps={{
              fontWeight: FontWeight.Regular,
              numberOfLines:
                rowTestID === GachaCardDisplayTestIds.OWNER ? 1 : 3,
              ellipsizeMode:
                rowTestID === GachaCardDisplayTestIds.OWNER ? 'middle' : 'tail',
              twClassName: 'text-right',
              testID: rowTestID,
            }}
          />
        ))}
      </Card>
    </Box>
  );
};

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
  const value = getCardValue(card);
  const valueSource =
    card.listedPriceUsd !== undefined &&
    (card.insuredValue === undefined || card.listedPriceUsd > card.insuredValue)
      ? 'gacha.card.asking_price'
      : 'gacha.card.insured_value';
  const isReveal = variant === 'reveal';
  const alignment = isReveal ? BoxAlignItems.Center : BoxAlignItems.Start;

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      gap={isReveal ? 3 : 6}
      twClassName="w-full"
      testID={GachaCardDisplayTestIds.CONTAINER}
    >
      <Box
        marginVertical={isReveal ? 2 : 6}
        twClassName={isReveal ? 'w-4/5 max-w-80' : 'w-2/3 max-w-64'}
        style={imageMaxWidth ? { maxWidth: imageMaxWidth } : undefined}
      >
        <InteractiveCard
          key={card.mint}
          frontImage={card.image}
          backImage={card.backImage}
          frontPreviewImage={card.mediumImage}
          backPreviewImage={card.mediumBackImage}
          name={card.name}
          isActive={isActive}
          onImageReady={onImageReady}
        />
      </Box>
      <Box
        alignItems={alignment}
        gap={3}
        twClassName="w-full"
        style={{ opacity: showMetadata ? 1 : 0 }}
        accessibilityElementsHidden={!showMetadata}
        importantForAccessibility={
          showMetadata ? 'auto' : 'no-hide-descendants'
        }
      >
        <Text
          variant={TextVariant.HeadingMd}
          twClassName={isReveal ? 'text-center' : 'text-left'}
          testID={GachaCardDisplayTestIds.NAME}
        >
          {card.name}
        </Text>
        {isReveal && (gradeLabel || card.rarity) && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            {gradeLabel && (
              <Tag
                severity={TagSeverity.Neutral}
                testID={GachaCardDisplayTestIds.GRADE}
              >
                {gradeLabel}
              </Tag>
            )}
            {card.rarity && (
              <Tag
                severity={RARITY_TAG_SEVERITY[card.rarity]}
                testID={GachaCardDisplayTestIds.RARITY}
              >
                {getRarityLabel(card.rarity)}
              </Tag>
            )}
          </Box>
        )}
      </Box>
      {value !== undefined && (
        <Box
          alignItems={alignment}
          gap={2}
          twClassName="w-full"
          style={{ opacity: showMetadata ? 1 : 0 }}
          accessibilityElementsHidden={!showMetadata}
          importantForAccessibility={
            showMetadata ? 'auto' : 'no-hide-descendants'
          }
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('gacha.card.value')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <UsdcIcon size={AvatarTokenSize.Md} />
            <Text
              variant={TextVariant.DisplayMd}
              testID={GachaCardDisplayTestIds.VALUE}
            >
              {formatNumber(value)}
            </Text>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(valueSource)}
          </Text>
        </Box>
      )}
      {!isReveal && (
        <Box gap={6} twClassName="w-full">
          <CardDetailSection
            title={strings('gacha.card.details')}
            testID={GachaCardDisplayTestIds.DETAILS}
            rows={[
              {
                label: strings('gacha.card.owner'),
                value: owner,
                testID: GachaCardDisplayTestIds.OWNER,
              },
              {
                label: strings('gacha.card.year'),
                value: card.year,
                testID: GachaCardDisplayTestIds.YEAR,
              },
            ]}
          />
          <CardDetailSection
            title={strings('gacha.card.grade')}
            testID={GachaCardDisplayTestIds.GRADING}
            rows={[
              {
                label: strings('gacha.card.grading_company'),
                value: card.gradingCompany,
                testID: GachaCardDisplayTestIds.GRADING_COMPANY,
              },
              {
                label: strings('gacha.card.grading_id'),
                value: card.gradingId,
                testID: GachaCardDisplayTestIds.GRADING_ID,
              },
              {
                label: strings('gacha.card.grade'),
                value: card.grade,
                testID: GachaCardDisplayTestIds.GRADE,
              },
            ]}
          />
          <CardDetailSection
            title={strings('gacha.card.metadata')}
            testID={GachaCardDisplayTestIds.METADATA}
            rows={[
              {
                label: strings('gacha.card.collection'),
                value: card.category,
                testID: GachaCardDisplayTestIds.COLLECTION,
              },
              {
                label: strings('gacha.card.set'),
                value: card.set,
                testID: GachaCardDisplayTestIds.SET,
              },
              {
                label: strings('gacha.card.rarity'),
                value: card.rarity ? getRarityLabel(card.rarity) : undefined,
                testID: GachaCardDisplayTestIds.RARITY,
              },
            ]}
          />
        </Box>
      )}
    </Box>
  );
};

export default CardDisplay;
