import React from 'react';
import { useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import GradingBadge from './GradingBadge';
import type { CollectiblesInventoryCard } from '../../types';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { getCardTitle, getGradeLabel } from './cardLabels';

const getMetadataHeight = (fontScale: number) =>
  Math.max(
    typography.sBodySM.lineHeight * fontScale,
    typography.sBodyXS.lineHeight * fontScale + 4,
  );

/** Matches the two label rows and spacing, for equally sized list placeholders. */
export const getCardSummaryHeight = (fontScale: number): number =>
  12 + typography.sBodySM.lineHeight * fontScale + getMetadataHeight(fontScale);

/** Replit CollectionCard/PackInventory identity: rarity, Set, value and grade. */
export default function CardSummary({
  card,
  value = card.insuredValue,
  formattedValue,
  nameTestID,
  valueTestID,
}: {
  card: CollectiblesInventoryCard;
  value?: number | null;
  /** Display-only override; callers retain the source valuation in USD. */
  formattedValue?: string;
  nameTestID?: string;
  valueTestID?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const grade = getGradeLabel(card);
  const valueLabel =
    formattedValue ?? (value == null ? undefined : formatUsd(value));
  // A missing value or grade must not collapse the metadata row. Use the same
  // scaled typography as the labels, including the grade badge's vertical inset.
  const metadataHeight = getMetadataHeight(fontScale);
  return (
    <Box gap={1} paddingTop={2}>
      <Box
        twClassName="flex-row items-center gap-1"
        style={{ minHeight: typography.sBodySM.lineHeight * fontScale }}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          twClassName="flex-1"
          testID={nameTestID}
        >
          {getCardTitle(card)}
        </Text>
      </Box>
      <Box
        twClassName="flex-row items-center gap-2"
        style={{ minHeight: metadataHeight }}
        testID={`collectibles-card-metadata-${card.mint}`}
      >
        {valueLabel !== undefined && (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            twClassName="shrink"
            testID={valueTestID}
          >
            {valueLabel}
          </Text>
        )}
        {grade && (
          <Box twClassName="shrink max-w-[70%]">
            <GradingBadge label={grade} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
